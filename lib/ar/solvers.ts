/**
 * Anchor solvers — the geometric heart of the Body-Part AR Tracking Engine.
 * Each solver turns raw landmarks from one tracker into metric 6-DoF anchor poses
 * (camera space, metres) plus occluder volumes. Solvers are pure functions: no
 * rendering, no state — which keeps them testable and lets new anchors be added
 * without touching the renderer.
 */
import * as THREE from 'three';
import type { NormalizedLandmark, Landmark } from '@mediapipe/tasks-vision';
import type { ARConfig, Finger } from './config';
import { CamModel, unproject, imgLen, depthFrom, basisQuat, mp3, median } from './math';
import type { Pose } from './filters';

export interface Occluder { kind: 'cylinder' | 'ellipsoid'; pose: Pose; radii: [number, number, number] } // cylinder: [rx, halfLength, rz]
export interface AnchorSolution {
  poses: Pose[];
  visibility: number[];            // 0..1 per pose
  occluders: Occluder[];
  lips?: { outer: { x: number; y: number }[]; inner: { x: number; y: number }[] };
  plane?: { width: number; height: number };
  debug?: { x: number; y: number }[];
}

export interface HandFrame { lm: NormalizedLandmark[]; wl: Landmark[]; handedness: string }
export interface FaceFrame { lm: NormalizedLandmark[]; matrix: number[] | null }
export interface PoseFrame { lm: NormalizedLandmark[]; wl: Landmark[] }

const TO_CAMERA = (p: THREE.Vector3) => p.clone().multiplyScalar(-1).normalize();
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- HAND
const FINGER_JOINTS: Record<Finger, [number, number]> = { index: [5, 6], middle: [9, 10], ring: [13, 14], pinky: [17, 18] };
const FINGER_RADIUS: Record<Finger, number> = { index: 0.0092, middle: 0.0094, ring: 0.0087, pinky: 0.0077 };
const NAIL_TIPS: [number, number][] = [[3, 4], [7, 8], [11, 12], [15, 16], [19, 20]];
export const NAIL_WIDTHS = [0.0142, 0.0114, 0.012, 0.011, 0.0092];

interface HandGeom { P: THREE.Vector3[]; W: THREE.Vector3[]; dorsal: THREE.Vector3; thumbSide: THREE.Vector3; bodyScale: number }

function handGeometry(f: HandFrame, cam: CamModel): HandGeom {
  const W = f.wl.map(mp3);
  const pairs: [number, number][] = [[0, 5], [0, 17], [5, 17], [0, 9], [5, 9], [9, 17]];
  const depths = pairs.map(([a, b]) => {
    const w = Math.hypot(W[a].x - W[b].x, W[a].y - W[b].y);
    return depthFrom(w, imgLen(f.lm[a], f.lm[b], cam.aspect), cam);
  });
  const d = median(depths);
  const zc = (W[0].z + W[5].z + W[9].z + W[17].z) / 4;
  const P = f.lm.map((l, i) => unproject(l.x, l.y, Math.max(0.05, d - (W[i].z - zc)), cam));
  // palm normal. MediaPipe labels handedness assuming a mirrored (selfie) image; we feed raw frames,
  // so the label is inverted relative to the physical hand — the sign below accounts for that.
  const n = new THREE.Vector3().crossVectors(W[5].clone().sub(W[0]), W[17].clone().sub(W[0])).normalize();
  const dorsal = f.handedness === 'Left' ? n : n.clone().multiplyScalar(-1);
  const thumbSide = W[5].clone().sub(W[17]).normalize();
  const palmW = W[5].distanceTo(W[17]);
  return { P, W, dorsal, thumbSide, bodyScale: THREE.MathUtils.clamp(palmW / 0.068, 0.75, 1.3) };
}

export function solveFinger(f: HandFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = handGeometry(f, cam);
  const [m, p] = FINGER_JOINTS[cfg.finger];
  const y = g.W[p].clone().sub(g.W[m]).normalize();
  const q = basisQuat(y, g.dorsal);
  const pos = g.P[m].clone().lerp(g.P[p], 0.42);
  const s = cfg.fitToBody ? g.bodyScale * FINGER_RADIUS[cfg.finger] / FINGER_RADIUS.ring : 1;
  const r = FINGER_RADIUS[cfg.finger] * (cfg.fitToBody ? g.bodyScale : 1);
  const segLen = g.P[m].distanceTo(g.P[p]);
  return {
    poses: [{ position: pos, quaternion: q, scale: s }], visibility: [1],
    occluders: [
      { kind: 'cylinder', pose: { position: g.P[m].clone().lerp(g.P[p], 0.5), quaternion: q, scale: 1 }, radii: [r * 0.93, segLen * 0.85, r * 0.8] },
    ],
    debug: [m, p].map(i => f.lm[i]),
  };
}

export function solveWrist(f: HandFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = handGeometry(f, cam);
  const y = g.W[9].clone().sub(g.W[0]).normalize();
  const q = basisQuat(y, g.dorsal);
  const s = cfg.fitToBody ? g.bodyScale : 1;
  const pos = g.P[0].clone().add(new THREE.Vector3(0, -0.022 * s, 0).applyQuaternion(q));
  const occPos = g.P[0].clone().add(new THREE.Vector3(0, -0.06 * s, 0).applyQuaternion(q));
  return {
    poses: [{ position: pos, quaternion: q, scale: s }], visibility: [1],
    occluders: [{ kind: 'cylinder', pose: { position: occPos, quaternion: q, scale: 1 }, radii: [0.0282 * s, 0.07 * s, 0.0205 * s] }],
    debug: [0, 5, 9, 17].map(i => f.lm[i]),
  };
}

export function solveNails(f: HandFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = handGeometry(f, cam);
  const poses: Pose[] = []; const visibility: number[] = [];
  NAIL_TIPS.forEach(([dip, tip], i) => {
    const y = g.W[tip].clone().sub(g.W[dip]).normalize();
    const nApprox = i === 0 ? g.dorsal.clone().multiplyScalar(0.45).add(g.thumbSide.clone().multiplyScalar(0.9)) : g.dorsal;
    const q = basisQuat(y, nApprox);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const s = cfg.fitToBody ? g.bodyScale : 1;
    const pos = g.P[dip].clone().lerp(g.P[tip], 0.4).addScaledVector(normal, 0.0048 * s * (NAIL_WIDTHS[i] / 0.0115));
    poses.push({ position: pos, quaternion: q, scale: s });
    visibility.push(smooth(0.05, 0.3, normal.dot(TO_CAMERA(pos))));
  });
  return { poses, visibility, occluders: [], debug: NAIL_TIPS.flat().map(i => f.lm[i]) };
}

// ---------------------------------------------------------------- FACE
export const LIPS_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
export const LIPS_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

interface FaceGeom { P168: THREE.Vector3; q: THREE.Quaternion; faceScale: number; P: (i: number) => THREE.Vector3 }

function faceGeometry(f: FaceFrame, cam: CamModel): FaceGeom {
  const q = new THREE.Quaternion();
  if (f.matrix) {
    const m = new THREE.Matrix4().fromArray(f.matrix);
    const pos = new THREE.Vector3(), sc = new THREE.Vector3();
    m.decompose(pos, q, sc);
  } else {
    // fallback: build from landmarks (eye corners + forehead/chin)
    const L = f.lm;
    const x = mp3({ x: (L[263].x - L[33].x) * cam.aspect, y: L[263].y - L[33].y, z: (L[263].z - L[33].z) * cam.aspect });
    const yv = mp3({ x: (L[10].x - L[152].x) * cam.aspect, y: L[10].y - L[152].y, z: (L[10].z - L[152].z) * cam.aspect });
    q.copy(basisQuat(yv, new THREE.Vector3().crossVectors(x, yv)));
  }
  const L = f.lm;
  const eyeVec = new THREE.Vector3(0.0915, 0, 0).applyQuaternion(q);
  const d = depthFrom(Math.hypot(eyeVec.x, eyeVec.y), imgLen(L[33], L[263], cam.aspect), cam);
  const zRef = (L[33].z + L[263].z) / 2;
  const P = (i: number) => unproject(L[i].x, L[i].y, Math.max(0.08, d + (L[i].z - zRef) * 2 * cam.tanH * cam.aspect * d), cam);
  const faceW = P(234).distanceTo(P(454));
  return { P168: P(168), q, faceScale: THREE.MathUtils.clamp(faceW / 0.145, 0.8, 1.25), P };
}

function headOccluder(g: FaceGeom): Occluder {
  const c = g.P168.clone().add(new THREE.Vector3(0, 0.012, -0.1).applyQuaternion(g.q));
  return { kind: 'ellipsoid', pose: { position: c, quaternion: g.q, scale: 1 }, radii: [0.077 * g.faceScale, 0.108 * g.faceScale, 0.099] };
}

export function solveEyes(f: FaceFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = faceGeometry(f, cam);
  const pos = g.P168.clone().add(new THREE.Vector3(0, 0, 0.006).applyQuaternion(g.q));
  return { poses: [{ position: pos, quaternion: g.q, scale: cfg.fitToBody ? THREE.MathUtils.clamp(g.faceScale, 0.92, 1.08) : 1 }], visibility: [1], occluders: [headOccluder(g)], debug: [33, 263, 168, 1].map(i => f.lm[i]) };
}

export function solveEars(f: FaceFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = faceGeometry(f, cam);
  const poses: Pose[] = [];
  for (const side of [-1, 1]) {
    const local = new THREE.Vector3(side * 0.0715 * g.faceScale, -0.047, -0.079);
    poses.push({ position: g.P168.clone().add(local.applyQuaternion(g.q)), quaternion: g.q.clone(), scale: 1 });
  }
  return { poses, visibility: cfg.pair ? [1, 1] : [1, 0], occluders: [headOccluder(g)], debug: [234, 454].map(i => f.lm[i]) };
}

export function solveHeadTop(f: FaceFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = faceGeometry(f, cam);
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.2);
  const q = g.q.clone().multiply(tilt);
  const pos = g.P168.clone().add(new THREE.Vector3(0, 0.05, -0.088).applyQuaternion(g.q));
  return { poses: [{ position: pos, quaternion: q, scale: cfg.fitToBody ? g.faceScale : 1 }], visibility: [1], occluders: [headOccluder(g)], debug: [10, 168].map(i => f.lm[i]) };
}

export function solveLips(f: FaceFrame): AnchorSolution {
  return { poses: [], visibility: [], occluders: [], lips: { outer: LIPS_OUTER.map(i => f.lm[i]), inner: LIPS_INNER.map(i => f.lm[i]) } };
}

// ---------------------------------------------------------------- BODY POSE
interface BodyGeom { P: THREE.Vector3[]; q: THREE.Quaternion; scale: number; vis: (i: number) => number }

function bodyGeometry(f: PoseFrame, cam: CamModel): BodyGeom {
  const W = f.wl.map(mp3);
  const shW = Math.hypot(W[11].x - W[12].x, W[11].y - W[12].y);
  const d = depthFrom(shW, imgLen(f.lm[11], f.lm[12], cam.aspect), cam);
  const zc = (W[11].z + W[12].z) / 2;
  const P = f.lm.map((l, i) => unproject(l.x, l.y, Math.max(0.2, d - (W[i].z - zc)), cam));
  const X = W[11].clone().sub(W[12]).normalize();
  const earMid = W[7].clone().add(W[8]).multiplyScalar(0.5);
  const shMid = W[11].clone().add(W[12]).multiplyScalar(0.5);
  const up = earMid.sub(shMid).normalize();
  const Z = new THREE.Vector3().crossVectors(X, up).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  return { P, q, scale: THREE.MathUtils.clamp(W[11].distanceTo(W[12]) / 0.36, 0.75, 1.3), vis: (i) => f.lm[i].visibility ?? 1 };
}

export function solveNeck(f: PoseFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = bodyGeometry(f, cam);
  const sh = g.P[11].clone().add(g.P[12]).multiplyScalar(0.5);
  const mouth = g.P[9].clone().add(g.P[10]).multiplyScalar(0.5);
  const pos = sh.clone().lerp(mouth, 0.3).add(new THREE.Vector3(0, 0, -0.03).applyQuaternion(g.q));
  const s = cfg.fitToBody ? g.scale : 1;
  const ok = Math.min(g.vis(11), g.vis(12)) > 0.5 ? 1 : 0;
  return {
    poses: [{ position: pos, quaternion: g.q, scale: s }], visibility: [ok],
    occluders: [{ kind: 'cylinder', pose: { position: pos.clone().add(new THREE.Vector3(0, 0.07, -0.004).applyQuaternion(g.q)), quaternion: g.q, scale: 1 }, radii: [0.057 * s, 0.09, 0.052 * s] }],
    debug: [9, 10, 11, 12].map(i => f.lm[i]),
  };
}

export function solveShoulder(f: PoseFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = bodyGeometry(f, cam);
  const i = cfg.side === 'left' ? 11 : 12; const sgn = cfg.side === 'left' ? 1 : -1;
  const pos = g.P[i].clone().add(new THREE.Vector3(sgn * 0.035, -0.01, 0.02).applyQuaternion(g.q));
  return { poses: [{ position: pos, quaternion: g.q, scale: cfg.fitToBody ? g.scale : 1 }], visibility: [g.vis(i) > 0.5 ? 1 : 0], occluders: [], debug: [11, 12, 23, 24].map(k => f.lm[k]) };
}

export function solveTorso(f: PoseFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = bodyGeometry(f, cam);
  const sh = g.P[11].clone().add(g.P[12]).multiplyScalar(0.5);
  const hip = g.P[23].clone().add(g.P[24]).multiplyScalar(0.5);
  const width = g.P[11].distanceTo(g.P[12]) * (cfg.imagePlane?.widthScale ?? 1.3);
  const height = sh.distanceTo(hip) * 1.3;
  const pos = sh.clone().lerp(hip, 0.45).add(new THREE.Vector3(0, 0, 0.05).applyQuaternion(g.q));
  const ok = Math.min(g.vis(11), g.vis(12), g.vis(23), g.vis(24)) > 0.5 ? 1 : 0;
  return { poses: [{ position: pos, quaternion: g.q, scale: 1 }], visibility: [ok], occluders: [], plane: { width, height }, debug: [11, 12, 23, 24].map(k => f.lm[k]) };
}

export function solveFeet(f: PoseFrame, cfg: ARConfig, cam: CamModel): AnchorSolution {
  const g = bodyGeometry(f, cam);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(g.q);
  const poses: Pose[] = []; const visibility: number[] = [];
  for (const [heel, toe] of [[29, 31], [30, 32]]) {
    const fwd = g.P[toe].clone().sub(g.P[heel]);
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const q = basisQuat(up, fwd);
    poses.push({ position: g.P[heel].clone().lerp(g.P[toe], 0.45), quaternion: q, scale: cfg.fitToBody ? g.scale : 1 });
    visibility.push(Math.min(g.vis(heel), g.vis(toe)) > 0.5 ? 1 : 0);
  }
  return { poses, visibility, occluders: [], debug: [29, 30, 31, 32].map(k => f.lm[k]) };
}
