/**
 * SKINIFY Body-Part AR Tracking Engine
 *
 *   TrackingEngine
 *   ├── HandTracker   (MediaPipe HandLandmarker, 21 landmarks + metric world landmarks)
 *   │     ├── finger anchor  → rings
 *   │     ├── wrist anchor   → watches, bracelets
 *   │     └── nails anchor   → per-finger nail caps
 *   ├── FaceTracker   (MediaPipe FaceLandmarker, 478 landmarks + facial transformation matrix)
 *   │     ├── eyes → glasses · ears → earrings · head_top → hats · lips → lip colour
 *   ├── BodyPoseTracker (MediaPipe PoseLandmarker lite, 33 landmarks + world landmarks)
 *   │     ├── neck → necklaces · shoulder → bags · torso → 2D garments · feet → shoes
 *   └── SurfacePlacement (no tracker; manual placement — WebXR hit-test lives in webxr.ts)
 *
 * Pipeline per video frame:  detect → solve anchor (metric 6-DoF) → filter (One Euro / slerp)
 *   → hold-on-loss → render (three.js, PBR + env lighting + depth-only occluders) → composite.
 * Everything runs on-device. No camera frame is uploaded.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { HandLandmarker, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { ARConfig, TrackingProfile, VariantOverrides, NailDesign, LipDesign, nailDesignSchema, lipDesignSchema } from './config';
import { createHandLandmarker, createFaceLandmarker, createPoseLandmarker } from './vision';
import { PoseFilter, Pose } from './filters';
import { CamModel } from './math';
import * as S from './solvers';
import { loadModel, normalise, applyOverrides } from './assets';
import { nailGeometry, nailMaterial } from './nails';

export type EngineStage = 'idle' | 'camera' | 'model' | 'tracker' | 'running' | 'stopped' | 'error';
export type TrackState = 'searching' | 'tracking' | 'holding' | 'lost';
export type EngineErrorCode = 'camera_denied' | 'camera_unavailable' | 'insecure_context' | 'unsupported' | 'model_failed' | 'tracker_failed' | 'network';

export interface EngineCallbacks {
  onStage?: (s: EngineStage, detail?: string) => void;
  onTrack?: (s: TrackState) => void;
  onHint?: (h: string | null) => void;
  onEvent?: (name: 'tracking_acquired' | 'tryon', data?: Record<string, unknown>) => void;
  onError?: (code: EngineErrorCode, message: string) => void;
  onMetrics?: (m: { fps: number; detectMs: number; delegate: string }) => void;
}

export interface EngineOptions extends EngineCallbacks {
  container: HTMLElement;
  profile: TrackingProfile;
  config: ARConfig;
  modelUrl?: string | null;
  overrides?: VariantOverrides | null;
  watermark?: { enabled: boolean; label: string };
  debug?: boolean;
}

const HOLD_MS = 380, FADE_MS = 220, HINT_AFTER_MS = 1400, TRYON_MS = 2000;

export class SkinnerEngine {
  private o: EngineOptions;
  private video!: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.01, 50);
  private overlay!: HTMLCanvasElement;
  private octx!: CanvasRenderingContext2D;
  private stage!: HTMLDivElement;
  private hemi = new THREE.HemisphereLight(0xffffff, 0x886666, 0.6);
  private key = new THREE.DirectionalLight(0xffffff, 1.2);
  private anchors: THREE.Group[] = [];
  private contents: THREE.Object3D[] = [];
  private occluders: THREE.Mesh[] = [];
  private filters: PoseFilter[] = [];
  private swing: THREE.Quaternion[] = [];
  private hand?: HandLandmarker; private face?: FaceLandmarker; private pose?: PoseLandmarker;
  private delegate = 'CPU';
  private facing: 'user' | 'environment' = 'user';
  private cam: CamModel = { tanH: Math.tan(THREE.MathUtils.degToRad(25)), aspect: 16 / 9 };
  private view = { cw: 1, ch: 1, fullW: 1, fullH: 1, offX: 0, offY: 0, dpr: 1 };
  private lastSeen = 0; private firstSeen = 0; private trackedMs = 0; private acquiredFired = false; private tryonFired = false;
  private trackState: TrackState = 'searching'; private opacity = 0; private hint: string | null = null;
  private lastTs = 0; private raf = 0; private vfc = 0; private running = false; private lastFrameT = 0;
  private lastSolution: S.AnchorSolution | null = null;
  private fpsAcc = { n: 0, t: 0, det: 0 };
  private lightT = 0; private lightCanvas?: HTMLCanvasElement;
  private captureReq: ((b: Blob) => void) | null = null;
  private recorder: MediaRecorder | null = null; private recCanvas: HTMLCanvasElement | null = null; private recChunks: Blob[] = [];
  private nails: NailDesign; private lips: LipDesign;
  private surface = { pos: new THREE.Vector3(0, -0.05, -0.7), rotY: 0.4, scale: 1 };
  private ro?: ResizeObserver;
  private destroyed = false;

  constructor(o: EngineOptions) {
    this.o = o;
    this.nails = nailDesignSchema.parse({ ...(o.config.nails || {}), ...(o.overrides?.nails || {}) });
    this.lips = lipDesignSchema.parse({ ...(o.config.lips || {}), ...(o.overrides?.lips || {}) });
    if (o.profile.tracker === 'surface' || o.profile.tracker === 'pose' && o.config.anchor === 'feet') this.facing = 'environment';
  }

  static isSupported() {
    if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' as const };
    if (!window.isSecureContext) return { ok: false, reason: 'insecure_context' as const };
    if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'unsupported' as const };
    try { const c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) return { ok: false, reason: 'unsupported' as const }; } catch { return { ok: false, reason: 'unsupported' as const }; }
    return { ok: true as const };
  }

  get facingMode() { return this.facing; }
  get mirrored() { return this.facing === 'user'; }

  // ------------------------------------------------------------------ lifecycle
  async start() {
    const sup = SkinnerEngine.isSupported();
    if (!sup.ok) { this.fail(sup.reason, 'This browser cannot run camera AR.'); return; }
    this.buildDom();
    this.o.onStage?.('camera');
    try { await this.openCamera(); } catch (e) { this.cameraError(e); return; }
    if (this.destroyed) return;
    this.o.onStage?.('model', 'Loading 3D product…');
    try { await this.buildContent(); } catch (e) { console.error(e); this.fail('model_failed', 'The 3D product could not be loaded.'); return; }
    this.o.onStage?.('tracker', 'Starting AR…');
    try { await this.loadTracker(); } catch (e) { console.error(e); this.fail(navigator.onLine ? 'tracker_failed' : 'network', 'The tracking model could not be loaded.'); return; }
    if (this.destroyed) return;
    this.running = true;
    this.o.onStage?.('running');
    this.setTrack(this.o.profile.tracker === 'surface' ? 'tracking' : 'searching');
    this.loop();
  }

  private fail(code: EngineErrorCode, msg: string) { this.o.onStage?.('error', code); this.o.onError?.(code, msg); }
  private cameraError(e: unknown) {
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') this.fail('camera_denied', 'Camera permission was denied.');
    else this.fail('camera_unavailable', 'No usable camera was found.');
  }

  private buildDom() {
    const c = this.o.container; c.innerHTML = '';
    this.stage = document.createElement('div');
    Object.assign(this.stage.style, { position: 'absolute', inset: '0', overflow: 'hidden', transform: this.mirrored ? 'scaleX(-1)' : 'none', touchAction: 'none' });
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', ''); this.video.muted = true; this.video.autoplay = true;
    Object.assign(this.video.style, { position: 'absolute', left: '0', top: '0', transformOrigin: '0 0' });
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x000000, 0);
    Object.assign(this.renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    this.overlay = document.createElement('canvas');
    Object.assign(this.overlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    this.octx = this.overlay.getContext('2d')!;
    // lips sit under the 3D layer, debug dots above; one canvas is fine for both
    this.stage.append(this.video, this.overlay, this.renderer.domElement);
    c.appendChild(this.stage);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.key.position.set(0.3, 1, 0.6);
    this.scene.add(this.hemi, this.key, this.camera);
    this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(c);
    if (this.o.profile.tracker === 'surface') this.bindSurfaceGestures();
  }

  private async openCamera() {
    this.stream?.getTracks().forEach(t => t.stop());
    const portrait = window.innerHeight > window.innerWidth;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: this.facing, width: { ideal: portrait ? 720 : 1280 }, height: { ideal: portrait ? 1280 : 720 }, frameRate: { ideal: 30, max: 30 } },
    });
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    await new Promise<void>((res) => { if (this.video.videoWidth) res(); else this.video.onloadedmetadata = () => res(); });
    this.stage.style.transform = this.mirrored ? 'scaleX(-1)' : 'none';
    this.layout();
  }

  async switchCamera() {
    this.facing = this.facing === 'user' ? 'environment' : 'user';
    try { await this.openCamera(); this.resetTracking(); } catch (e) { this.facing = this.facing === 'user' ? 'environment' : 'user'; await this.openCamera().catch(() => {}); throw e; }
  }

  static async hasMultipleCameras() {
    try { const d = await navigator.mediaDevices.enumerateDevices(); return d.filter(x => x.kind === 'videoinput').length > 1; } catch { return false; }
  }

  private layout() {
    if (!this.video?.videoWidth) return;
    const cw = this.o.container.clientWidth || 1, ch = this.o.container.clientHeight || 1;
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    const s = Math.max(cw / vw, ch / vh);
    const fullW = vw * s, fullH = vh * s;
    const offX = (fullW - cw) / 2, offY = (fullH - ch) / 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.view = { cw, ch, fullW, fullH, offX, offY, dpr };
    Object.assign(this.video.style, { width: `${vw}px`, height: `${vh}px`, transform: `translate(${-offX}px, ${-offY}px) scale(${s})` });
    const aspect = vw / vh;
    // Typical vertical FOV: phone portrait ≈ 64°, laptop webcam landscape ≈ 46°. Alignment does not
    // depend on this (depth is derived through the same projection); it only sets perspective strength.
    const fovY = aspect < 1 ? 64 : 46;
    this.cam = { tanH: Math.tan(THREE.MathUtils.degToRad(fovY / 2)), aspect };
    this.camera.fov = fovY; this.camera.aspect = aspect;
    this.camera.setViewOffset(fullW, fullH, offX, offY, cw, ch);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(cw, ch, false);
    this.overlay.width = Math.round(cw * dpr); this.overlay.height = Math.round(ch * dpr);
  }

  // ------------------------------------------------------------------ content
  private anchorCount() {
    const a = this.o.config.anchor;
    return a === 'nails' ? 5 : a === 'ears' || a === 'feet' ? 2 : a === 'lips' ? 0 : 1;
  }

  private async buildContent() {
    const cfg = this.o.config; const n = this.anchorCount();
    this.anchors = []; this.contents = []; this.filters = []; this.swing = [];
    let template: THREE.Object3D | null = null;
    if (this.o.profile.renderMode === 'model') {
      if (!this.o.modelUrl) throw new Error('No 3D asset attached to this Skinner');
      const gltf = await loadModel(this.o.modelUrl);
      template = gltf.scene;
    }
    for (let i = 0; i < n; i++) {
      const anchor = new THREE.Group(); anchor.visible = false; anchor.matrixAutoUpdate = true;
      const offset = new THREE.Group();
      const t = cfg.transform;
      offset.position.set(t.position[0] * (cfg.anchor === 'ears' && i === 0 ? -1 : 1), t.position[1], t.position[2]);
      offset.rotation.set(...(t.rotation.map(THREE.MathUtils.degToRad) as [number, number, number]));
      offset.scale.setScalar(t.scale);
      let content: THREE.Object3D;
      if (this.o.profile.renderMode === 'nails') {
        content = new THREE.Mesh(nailGeometry(this.nails.shape, S.NAIL_WIDTHS[i], this.nails.length), nailMaterial(this.nails, this.nails.length));
      } else if (this.o.profile.renderMode === 'image_plane') {
        const tex = await new THREE.TextureLoader().setCrossOrigin('anonymous').loadAsync(cfg.imagePlane?.url || '');
        tex.colorSpace = THREE.SRGBColorSpace;
        content = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      } else {
        content = normalise(template!, cfg);
        if (cfg.anchor === 'ears' && i === 0) content.scale.x *= -1; // mirror for the opposite ear
        applyOverrides(content, this.o.overrides);
      }
      const swing = new THREE.Group(); swing.add(content);
      offset.add(swing); anchor.add(offset);
      this.scene.add(anchor);
      this.anchors.push(anchor); this.contents.push(content); this.filters.push(new PoseFilter()); this.swing.push(new THREE.Quaternion());
      content.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.renderOrder = 2; (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => { mt.userData.baseOpacity = mt.opacity; mt.userData.baseTransparent = mt.transparent; }); } });
    }
    if (this.o.profile.tracker === 'surface') { this.anchors[0].visible = true; this.opacity = 1; }
  }

  applyVariant(ov: VariantOverrides | null) {
    this.o.overrides = ov;
    if (this.o.profile.renderMode === 'model') this.contents.forEach(c => applyOverrides(c, ov));
    if (this.o.profile.renderMode === 'nails') {
      this.nails = nailDesignSchema.parse({ ...(this.o.config.nails || {}), ...(ov?.nails || {}) });
      this.contents.forEach((c, i) => { const m = c as THREE.Mesh; m.geometry.dispose(); m.geometry = nailGeometry(this.nails.shape, S.NAIL_WIDTHS[i], this.nails.length); (m.material as THREE.Material).dispose(); m.material = nailMaterial(this.nails, this.nails.length); });
    }
    if (this.o.profile.renderMode === 'lips') this.lips = lipDesignSchema.parse({ ...(this.o.config.lips || {}), ...(ov?.lips || {}) });
  }

  private occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
  private debugOccMat = new THREE.MeshBasicMaterial({ color: 0x7c5cff, wireframe: true, transparent: true, opacity: 0.35 });
  private syncOccluders(list: S.Occluder[]) {
    const use = this.o.config.occlusion;
    while (this.occluders.length < list.length) {
      const k = list[this.occluders.length].kind;
      const g = k === 'cylinder' ? new THREE.CylinderGeometry(1, 1, 2, 24, 1) : new THREE.SphereGeometry(1, 28, 20);
      const m = new THREE.Mesh(g, this.o.debug ? this.debugOccMat : this.occluderMat); m.renderOrder = 0;
      this.scene.add(m); this.occluders.push(m);
    }
    this.occluders.forEach((m, i) => {
      const oc = list[i];
      if (!oc || !use) { m.visible = false; return; }
      m.visible = this.opacity > 0.01;
      m.position.copy(oc.pose.position); m.quaternion.copy(oc.pose.quaternion); m.scale.set(oc.radii[0], oc.radii[1], oc.radii[2]);
    });
  }

  // ------------------------------------------------------------------ tracking
  private async loadTracker() {
    const t = this.o.profile.tracker;
    if (t === 'hand') { const r = await createHandLandmarker(1); this.hand = r.task; this.delegate = r.delegate; }
    if (t === 'face') { const r = await createFaceLandmarker(); this.face = r.task; this.delegate = r.delegate; }
    if (t === 'pose') { const r = await createPoseLandmarker(); this.pose = r.task; this.delegate = r.delegate; }
  }

  private detect(now: number): S.AnchorSolution | null {
    const cfg = this.o.config; const cam = this.cam;
    let ts = now; if (ts <= this.lastTs) ts = this.lastTs + 1; this.lastTs = ts;
    if (this.hand) {
      const r = this.hand.detectForVideo(this.video, ts);
      if (!r.landmarks?.length || !r.worldLandmarks?.length) return null;
      const f: S.HandFrame = { lm: r.landmarks[0], wl: r.worldLandmarks[0], handedness: r.handedness?.[0]?.[0]?.categoryName || 'Right' };
      return cfg.anchor === 'wrist' ? S.solveWrist(f, cfg, cam) : cfg.anchor === 'nails' ? S.solveNails(f, cfg, cam) : S.solveFinger(f, cfg, cam);
    }
    if (this.face) {
      const r = this.face.detectForVideo(this.video, ts);
      if (!r.faceLandmarks?.length) return null;
      const f: S.FaceFrame = { lm: r.faceLandmarks[0], matrix: r.facialTransformationMatrixes?.[0]?.data ? Array.from(r.facialTransformationMatrixes[0].data) : null };
      switch (cfg.anchor) { case 'ears': return S.solveEars(f, cfg, cam); case 'head_top': return S.solveHeadTop(f, cfg, cam); case 'lips': return S.solveLips(f); default: return S.solveEyes(f, cfg, cam); }
    }
    if (this.pose) {
      const r = this.pose.detectForVideo(this.video, ts);
      if (!r.landmarks?.length || !r.worldLandmarks?.length) return null;
      const f: S.PoseFrame = { lm: r.landmarks[0], wl: r.worldLandmarks[0] };
      switch (cfg.anchor) { case 'shoulder': return S.solveShoulder(f, cfg, cam); case 'torso': return S.solveTorso(f, cfg, cam); case 'feet': return S.solveFeet(f, cfg, cam); default: return S.solveNeck(f, cfg, cam); }
    }
    return null;
  }

  resetTracking() {
    this.filters.forEach(f => f.reset()); this.lastSolution = null; this.opacity = this.o.profile.tracker === 'surface' ? 1 : 0;
    this.surface = { pos: new THREE.Vector3(0, -0.05, -0.7), rotY: 0.4, scale: 1 };
    this.setTrack(this.o.profile.tracker === 'surface' ? 'tracking' : 'searching');
  }

  private setTrack(s: TrackState) { if (s !== this.trackState) { this.trackState = s; this.o.onTrack?.(s); } }
  private setHint(h: string | null) { if (h !== this.hint) { this.hint = h; this.o.onHint?.(h); } }

  private loop = () => {
    if (!this.running) return;
    const v = this.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    const tick = () => { this.frame(performance.now()); if (this.running) this.schedule(); };
    this.tickFn = tick; this.schedule();
  };
  private tickFn: () => void = () => {};
  private schedule() {
    const v = this.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (v.requestVideoFrameCallback && this.o.profile.tracker !== 'surface') this.vfc = v.requestVideoFrameCallback(this.tickFn);
    else this.raf = requestAnimationFrame(this.tickFn);
  }

  private frame(now: number) {
    const dt = this.lastFrameT ? now - this.lastFrameT : 16; this.lastFrameT = now;
    let sol: S.AnchorSolution | null = null;
    if (this.o.profile.tracker !== 'surface' && this.video.readyState >= 2) {
      const t0 = performance.now();
      try { sol = this.detect(now); } catch (e) { console.warn('[skinify] detect error', e); }
      this.fpsAcc.det += performance.now() - t0;
    }
    this.fpsAcc.n++; this.fpsAcc.t += dt;
    if (this.fpsAcc.t > 1000) { this.o.onMetrics?.({ fps: Math.round(this.fpsAcc.n * 1000 / this.fpsAcc.t), detectMs: +(this.fpsAcc.det / this.fpsAcc.n).toFixed(1), delegate: this.delegate }); this.fpsAcc = { n: 0, t: 0, det: 0 }; }

    if (this.o.profile.tracker === 'surface') this.updateSurface();
    else this.updateTracking(sol, now, dt);

    this.estimateLight(now);
    this.drawOverlay();
    this.renderer.render(this.scene, this.camera);
    if (this.captureReq || this.recorder) this.composite();
  }

  private updateTracking(sol: S.AnchorSolution | null, now: number, dt: number) {
    const renderMode = this.o.profile.renderMode;
    if (sol) {
      if (this.trackState === 'lost' || this.trackState === 'searching') { this.filters.forEach(f => f.reset()); this.firstSeen = now; }
      this.lastSeen = now; this.lastSolution = sol;
      this.setTrack('tracking'); this.setHint(null);
      this.trackedMs += dt;
      if (!this.acquiredFired) { this.acquiredFired = true; this.o.onEvent?.('tracking_acquired'); }
      if (!this.tryonFired && this.trackedMs >= TRYON_MS) { this.tryonFired = true; this.o.onEvent?.('tryon', { trackedMs: Math.round(this.trackedMs) }); }
      this.opacity = Math.min(1, this.opacity + dt / 150);
      sol.poses.forEach((p, i) => {
        const a = this.anchors[i]; if (!a) return;
        const fp = this.filters[i].filter(p, now);
        a.position.copy(fp.position); a.quaternion.copy(fp.quaternion); a.scale.setScalar(fp.scale);
        if (renderMode === 'image_plane' && sol.plane) { const c = this.contents[i]; c.scale.set(sol.plane.width, sol.plane.height, 1); }
        this.applyDangle(i, a);
      });
    } else {
      const since = now - this.lastSeen;
      if (this.trackState === 'tracking' && since > 0) this.setTrack('holding');
      if (since > HOLD_MS) { this.opacity = Math.max(0, this.opacity - dt / FADE_MS); if (this.opacity === 0) this.setTrack(this.lastSeen ? 'lost' : 'searching'); }
      if (since > HINT_AFTER_MS) this.setHint(this.lastSeen ? `Tracking lost — ${this.o.profile.hint.toLowerCase()}` : this.o.profile.hint);
      if (!this.lastSeen && now - (this.firstSeen || now) === 0) this.firstSeen = now;
    }
    const s = this.lastSolution;
    this.anchors.forEach((a, i) => {
      const vis = (s?.visibility[i] ?? 0) * this.opacity;
      a.visible = vis > 0.01;
      this.setOpacity(this.contents[i], vis);
    });
    this.syncOccluders(s && this.opacity > 0 ? s.occluders : []);
  }

  private setOpacity(obj: THREE.Object3D, v: number) {
    obj.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => {
        const base = (mt.userData.baseOpacity ?? 1) as number; const baseT = !!mt.userData.baseTransparent;
        const want = v < 0.999 || baseT;
        if (mt.transparent !== want) { mt.transparent = want; mt.needsUpdate = true; }
        mt.opacity = base * v;
      });
    });
  }

  /** Gravity-driven swing for earrings / pendants: content's -Y relaxes toward world-down. */
  private applyDangle(i: number, anchor: THREE.Group) {
    const cfg = this.o.config;
    if (!cfg.dangle || cfg.anchor !== 'ears') return;
    const swingGroup = this.contents[i].parent as THREE.Group;
    const inv = anchor.quaternion.clone().invert();
    const gLocal = new THREE.Vector3(0, -1, 0).applyQuaternion(inv).normalize();
    const target = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), gLocal);
    // limit swing to ~50°
    const ang = 2 * Math.acos(Math.min(1, Math.abs(target.w)));
    if (ang > 0.87) target.slerp(new THREE.Quaternion(), 1 - 0.87 / ang);
    this.swing[i].slerp(target, 0.16);
    swingGroup.quaternion.copy(this.swing[i]);
  }

  // ------------------------------------------------------------------ surface placement
  private updateSurface() {
    const a = this.anchors[0]; if (!a) return;
    a.position.copy(this.surface.pos); a.quaternion.setFromEuler(new THREE.Euler(0.12, this.surface.rotY, 0)); a.scale.setScalar(this.surface.scale);
    a.visible = true; this.setOpacity(this.contents[0], 1);
    if (!this.acquiredFired) { this.acquiredFired = true; this.o.onEvent?.('tracking_acquired'); }
    this.trackedMs += 16; if (!this.tryonFired && this.trackedMs > TRYON_MS) { this.tryonFired = true; this.o.onEvent?.('tryon', { mode: 'surface' }); }
  }

  private bindSurfaceGestures() {
    const el = this.o.container; const pts = new Map<number, { x: number; y: number }>();
    let start: { d: number; a: number; s: number; r: number } | null = null;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [p, q] = [...pts.values()]; start = { d: Math.hypot(p.x - q.x, p.y - q.y), a: Math.atan2(q.y - p.y, q.x - p.x), s: this.surface.scale, r: this.surface.rotY }; } });
    el.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId); if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, cur);
      if (pts.size === 1) {
        const k = (-this.surface.pos.z * 2 * this.cam.tanH) / this.view.fullH;
        this.surface.pos.x += (cur.x - prev.x) * k * (this.mirrored ? -1 : 1); this.surface.pos.y -= (cur.y - prev.y) * k;
      } else if (pts.size === 2 && start) {
        const [p, q] = [...pts.values()];
        this.surface.scale = THREE.MathUtils.clamp(start.s * Math.hypot(p.x - q.x, p.y - q.y) / start.d, 0.2, 5);
        this.surface.rotY = start.r - (Math.atan2(q.y - p.y, q.x - p.x) - start.a);
      }
    });
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) start = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.surface.scale = THREE.MathUtils.clamp(this.surface.scale * (e.deltaY < 0 ? 1.06 : 0.94), 0.2, 5); }, { passive: false });
  }

  // ------------------------------------------------------------------ light estimation
  private estimateLight(now: number) {
    if (now - this.lightT < 450) return; this.lightT = now;
    if (!this.lightCanvas) { this.lightCanvas = document.createElement('canvas'); this.lightCanvas.width = 16; this.lightCanvas.height = 16; }
    const x = this.lightCanvas.getContext('2d', { willReadFrequently: true }); if (!x || this.video.readyState < 2) return;
    x.drawImage(this.video, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data;
    let r = 0, g = 0, b = 0, lx = 0, ly = 0, lt = 0;
    for (let i = 0; i < 256; i++) {
      const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2]; const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      r += R; g += G; b += B; lx += ((i % 16) / 15 - 0.5) * L; ly += (Math.floor(i / 16) / 15 - 0.5) * L; lt += L;
    }
    r /= 256; g /= 256; b /= 256; const lum = lt / 256 / 255;
    const env = THREE.MathUtils.clamp(0.45 + lum * 1.4, 0.45, 1.5);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(this.scene.environmentIntensity ?? 1, env, 0.5);
    const tint = new THREE.Color(r / 255, g / 255, b / 255); const m = Math.max(tint.r, tint.g, tint.b, 0.01); tint.multiplyScalar(1 / m).lerp(new THREE.Color(1, 1, 1), 0.6);
    this.hemi.color.lerp(tint, 0.5); this.hemi.intensity = 0.3 + lum * 0.8;
    const dir = new THREE.Vector3(lt ? lx / lt * 4 : 0.3, lt ? -ly / lt * 4 + 0.8 : 1, 0.7).normalize();
    this.key.position.lerp(dir, 0.4); this.key.intensity = 0.6 + lum * 1.2; this.key.color.copy(tint);
  }

  // ------------------------------------------------------------------ 2D overlay (lips, debug)
  private toPx(p: { x: number; y: number }) { const { fullW, fullH, offX, offY, dpr } = this.view; return [(p.x * fullW - offX) * dpr, (p.y * fullH - offY) * dpr] as const; }

  private drawOverlay() {
    const x = this.octx; x.clearRect(0, 0, this.overlay.width, this.overlay.height);
    const s = this.lastSolution;
    if (this.o.profile.renderMode === 'lips' && s?.lips && this.opacity > 0) {
      const path = new Path2D();
      const ring = (pts: { x: number; y: number }[]) => { pts.forEach((p, i) => { const [px, py] = this.toPx(p); i ? path.lineTo(px, py) : path.moveTo(px, py); }); path.closePath(); };
      ring(s.lips.outer); ring(s.lips.inner);
      x.save();
      x.filter = `blur(${1.6 * this.view.dpr}px)`;
      x.globalAlpha = this.lips.opacity * this.opacity;
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = this.lips.color; x.fill(path, 'evenodd');
      x.restore();
      if (this.lips.finish !== 'matte') {
        // specular highlight on the lower lip
        const lo = s.lips.outer, li = s.lips.inner;
        const [ax, ay] = this.toPx(lo[15]); const [bx, by] = this.toPx(li[15]);
        const cx = (ax + bx) / 2, cy = (ay + by) / 2; const w = Math.hypot(...this.toPx(lo[0]).map((v, k) => v - this.toPx(lo[10])[k]) as [number, number]);
        x.save(); x.clip(path, 'evenodd'); x.globalCompositeOperation = 'lighter';
        const gr = x.createRadialGradient(cx, cy, 0, cx, cy, w * 0.28);
        gr.addColorStop(0, `rgba(255,255,255,${(this.lips.finish === 'gloss' ? 0.32 : 0.14) * this.opacity})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(cx - w, cy - w, w * 2, w * 2); x.restore();
      }
    }
    if (this.o.debug && s?.debug) {
      x.fillStyle = '#7C5CFF';
      s.debug.forEach(p => { const [px, py] = this.toPx(p); x.beginPath(); x.arc(px, py, 4 * this.view.dpr, 0, Math.PI * 2); x.fill(); });
    }
  }

  // ------------------------------------------------------------------ capture (SKINIFY Snap)
  private composeInto(c: HTMLCanvasElement) {
    const { cw, ch, fullW, fullH, offX, offY, dpr } = this.view;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d')!;
    x.save();
    if (this.mirrored) { x.translate(W, 0); x.scale(-1, 1); }
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    x.drawImage(this.video, offX / fullW * vw, offY / fullH * vh, cw / fullW * vw, ch / fullH * vh, 0, 0, W, H);
    x.drawImage(this.overlay, 0, 0, W, H);
    x.drawImage(this.renderer.domElement, 0, 0, W, H);
    x.restore();
    if (this.o.watermark?.enabled) {
      const pad = 18 * dpr; x.save();
      x.font = `600 ${13 * dpr}px ui-sans-serif, system-ui, sans-serif`; x.textBaseline = 'bottom';
      const label = this.o.watermark.label; const tw = x.measureText(label).width;
      x.fillStyle = 'rgba(12,10,16,0.38)';
      const bw = tw + 82 * dpr, bh = 30 * dpr;
      x.beginPath(); x.roundRect(pad, H - pad - bh, bw, bh, bh / 2); x.fill();
      x.fillStyle = '#fff'; x.font = `800 ${12 * dpr}px ui-sans-serif, system-ui, sans-serif`; x.fillText('SKINIFY', pad + 12 * dpr, H - pad - 9 * dpr);
      x.globalAlpha = 0.85; x.font = `500 ${12 * dpr}px ui-sans-serif, system-ui, sans-serif`; x.fillText(label, pad + 70 * dpr, H - pad - 9 * dpr);
      x.restore();
    }
  }

  private composite() {
    if (this.captureReq) {
      const c = document.createElement('canvas'); this.composeInto(c);
      const done = this.captureReq; this.captureReq = null;
      c.toBlob((b) => b && done(b), 'image/jpeg', 0.92);
    }
    if (this.recorder && this.recCanvas) this.composeInto(this.recCanvas);
  }

  capturePhoto(): Promise<Blob> { return new Promise((res) => { this.captureReq = res; }); }

  static recordingMime() {
    if (typeof MediaRecorder === 'undefined') return null;
    for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MediaRecorder.isTypeSupported?.(t)) return t;
    return null;
  }

  startRecording(maxMs = 15000) {
    const mime = SkinnerEngine.recordingMime(); if (!mime) throw new Error('Recording not supported');
    this.recCanvas = document.createElement('canvas'); this.composeInto(this.recCanvas);
    const stream = this.recCanvas.captureStream(30);
    this.recChunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    this.recorder.ondataavailable = (e) => e.data.size && this.recChunks.push(e.data);
    this.recorder.start(250);
    const r = this.recorder; setTimeout(() => { if (this.recorder === r) this.stopRecording(); }, maxMs);
  }

  stopRecording(): Promise<Blob | null> {
    const r = this.recorder; if (!r) return Promise.resolve(null);
    return new Promise((res) => {
      r.onstop = () => { const b = new Blob(this.recChunks, { type: r.mimeType }); this.recorder = null; this.recCanvas = null; res(b); this.onRecordingStopped?.(b); };
      r.stop();
    });
  }
  onRecordingStopped?: (b: Blob) => void;
  get isRecording() { return !!this.recorder; }

  // ------------------------------------------------------------------ teardown
  stopCamera() { this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; }

  destroy() {
    this.destroyed = true; this.running = false;
    cancelAnimationFrame(this.raf);
    const v = this.video as (HTMLVideoElement & { cancelVideoFrameCallback?: (h: number) => void }) | undefined;
    if (v?.cancelVideoFrameCallback && this.vfc) v.cancelVideoFrameCallback(this.vfc);
    this.recorder?.stop();
    this.stopCamera();
    this.hand?.close(); this.face?.close(); this.pose?.close();
    this.ro?.disconnect();
    this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); } });
    this.renderer?.dispose();
    this.o.onStage?.('stopped');
  }
}
