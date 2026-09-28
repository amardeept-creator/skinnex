/** Lightweight 3D product viewer (orbit, PBR, env lighting). Used on product pages, the hero,
 *  the Skinner builder (with an anatomical reference proxy) and as the no-camera fallback. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadModel, normalise, applyOverrides, listMaterials } from './assets';
import type { ARConfig, VariantOverrides, NailDesign } from './config';
import { nailGeometry, nailMaterial } from './nails';

export interface ViewerOptions { autoRotate?: boolean; interactive?: boolean; reference?: boolean; zoom?: number; onReady?: (info: { materials: string[]; size: THREE.Vector3; triangles: number }) => void; onError?: (e: unknown) => void }

export class ModelViewer {
  private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera = new THREE.PerspectiveCamera(30, 1, 0.001, 100);
  private controls: OrbitControls; private holder = new THREE.Group(); private refGroup = new THREE.Group();
  private content: THREE.Object3D | null = null; private raf = 0; private ro: ResizeObserver; private visible = true; private io: IntersectionObserver;
  private base: THREE.Object3D | null = null; private cfg: ARConfig | null = null; private ov: VariantOverrides | null = null;
  private radius = 0.05;

  constructor(private el: HTMLElement, private o: ViewerOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;outline:none;touch-action:none';
    el.appendChild(this.renderer.domElement);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(1, 2, 1.5); this.scene.add(key, new THREE.HemisphereLight(0xffffff, 0xe8dff5, 0.5));
    this.scene.add(this.holder, this.refGroup);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.enablePan = false; this.controls.autoRotate = !!o.autoRotate; this.controls.autoRotateSpeed = 1.6;
    this.controls.enabled = o.interactive !== false;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
    this.io = new IntersectionObserver((e) => { this.visible = e[0]?.isIntersecting ?? true; }); this.io.observe(el);
    this.resize(); this.tick();
  }

  private resize() { const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private tick = () => { this.raf = requestAnimationFrame(this.tick); if (!this.visible) return; this.controls.update(); this.renderer.render(this.scene, this.camera); };

  async load(url: string, cfg?: ARConfig | null, ov?: VariantOverrides | null) {
    try {
      const gltf = await loadModel(url);
      this.base = gltf.scene; this.cfg = cfg || null; this.ov = ov || null;
      this.rebuild(true);
      let tris = 0; gltf.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
      const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
      this.o.onReady?.({ materials: listMaterials(gltf.scene), size, triangles: Math.round(tris) });
    } catch (e) { this.o.onError?.(e); }
  }

  showNails(d: NailDesign) {
    this.base = null; this.clear();
    const g = new THREE.Group();
    const widths = [0.0142, 0.0114, 0.012, 0.011, 0.0092];
    widths.forEach((w, i) => { const m = new THREE.Mesh(nailGeometry(d.shape, w, d.length), nailMaterial(d, d.length)); m.position.set((i - 2) * 0.017, Math.cos((i - 2) * 0.4) * 0.006, 0); m.rotation.z = -(i - 2) * 0.1; g.add(m); });
    g.rotation.x = -0.5; this.content = g; this.holder.add(g); this.frame(true);
  }

  private clear() { if (this.content) this.holder.remove(this.content); this.content = null; }

  setConfig(cfg: ARConfig | null) { this.cfg = cfg; this.rebuild(false); }
  setOverrides(ov: VariantOverrides | null) { this.ov = ov; if (this.content) applyOverrides(this.content, ov); }

  private rebuild(reframe: boolean) {
    if (!this.base) return;
    this.clear();
    const cfg = this.cfg;
    let obj: THREE.Object3D;
    if (cfg) {
      const n = normalise(this.base, cfg);
      const off = new THREE.Group(); off.add(n);
      off.position.fromArray(cfg.transform.position); off.rotation.set(...(cfg.transform.rotation.map(THREE.MathUtils.degToRad) as [number, number, number])); off.scale.setScalar(cfg.transform.scale);
      obj = off;
      if (this.o.reference) this.buildReference(cfg);
    } else {
      obj = this.base.clone(true);
      obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = (m.material as THREE.Material).clone(); });
    }
    applyOverrides(obj, this.ov);
    this.content = obj; this.holder.add(obj);
    this.frame(reframe);
  }

  /** Translucent anatomical proxy so sellers can see how the product sits on the body part. */
  private buildReference(cfg: ARConfig) {
    this.refGroup.clear();
    const mat = new THREE.MeshStandardMaterial({ color: 0xe9cfc4, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false });
    const add = (g: THREE.BufferGeometry, p: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]) => { const m = new THREE.Mesh(g, mat); m.position.fromArray(p); m.scale.fromArray(s); this.refGroup.add(m); };
    switch (cfg.anchor) {
      case 'finger': add(new THREE.CylinderGeometry(0.0087, 0.0082, 0.06, 32), [0, 0.01, 0]); break;
      case 'wrist': add(new THREE.CylinderGeometry(1, 1, 0.12, 48), [0, -0.03, 0], [0.028, 1, 0.0205]); break;
      case 'eyes': case 'ears': case 'head_top': add(new THREE.SphereGeometry(1, 48, 32), [0, 0.012, -0.1], [0.077, 0.108, 0.099]); break;
      case 'neck': add(new THREE.CylinderGeometry(0.057, 0.06, 0.18, 40), [0, 0.07, -0.004]); break;
      default: break;
    }
  }

  private frame(reframe: boolean) {
    const target = this.cfg && this.o.reference ? this.refGroup.children.length ? this.refGroup : this.holder : this.holder;
    const box = new THREE.Box3().setFromObject(this.holder);
    if (target === this.refGroup) box.union(new THREE.Box3().setFromObject(this.refGroup));
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()); const r = box.getSize(new THREE.Vector3()).length() / 2;
    this.radius = r;
    if (!this.o.reference) this.holder.position.sub(c).add(this.holder.position.clone().multiplyScalar(0));
    const center = this.o.reference ? c : new THREE.Vector3();
    if (!this.o.reference) { this.holder.position.set(0, 0, 0); const b2 = new THREE.Box3().setFromObject(this.holder); this.holder.position.sub(b2.getCenter(new THREE.Vector3())); }
    if (reframe) {
      const dist = r / Math.sin(THREE.MathUtils.degToRad(15)) * (this.o.zoom ?? 1.05);
      this.camera.near = r / 100; this.camera.far = r * 100; this.camera.updateProjectionMatrix();
      this.camera.position.set(center.x + dist * 0.45, center.y + dist * 0.3, center.z + dist * 0.84);
      this.controls.target.copy(center); this.controls.minDistance = r * 1.5; this.controls.maxDistance = r * 8;
    }
  }

  dispose() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io.disconnect(); this.controls.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
