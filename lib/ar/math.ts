import * as THREE from 'three';

export interface CamModel { tanH: number; aspect: number } // aspect = videoWidth / videoHeight

/** Normalised image coords (0..1, y down) at metric depth d (m) → camera-space point (three.js, -Z forward). */
export function unproject(u: number, v: number, d: number, c: CamModel, out = new THREE.Vector3()) {
  return out.set((u - 0.5) * 2 * c.tanH * c.aspect * d, -(v - 0.5) * 2 * c.tanH * d, -d);
}

/** Image length in "height units" between two normalised points. */
export function imgLen(a: { x: number; y: number }, b: { x: number; y: number }, aspect: number) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

/** Depth at which a real segment whose camera-plane projected length is `worldXY` metres appears `img` height-units long. */
export function depthFrom(worldXY: number, img: number, c: CamModel) {
  return worldXY / Math.max(1e-6, img * 2 * c.tanH);
}

/** Orthonormal basis from a primary Y axis and an approximate Z axis → quaternion. */
export function basisQuat(y: THREE.Vector3, zApprox: THREE.Vector3) {
  const Y = y.clone().normalize();
  const X = new THREE.Vector3().crossVectors(Y, zApprox).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  const m = new THREE.Matrix4().makeBasis(X, Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/** MediaPipe landmark (x right, y down, z away from camera) → three.js orientation space (x right, y up, z toward camera). */
export function mp3(l: { x: number; y: number; z: number }) { return new THREE.Vector3(l.x, -l.y, -l.z); }

export const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
