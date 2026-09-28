import * as THREE from 'three';

/** One Euro filter (Casiez et al. 2012): low jitter when still, low lag when moving. */
export class OneEuro {
  private xPrev: number | null = null; private dxPrev = 0; private tPrev = 0;
  constructor(public minCutoff = 1.2, public beta = 0.02, public dCutoff = 1.0) {}
  private alpha(cutoff: number, dt: number) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  reset() { this.xPrev = null; }
  filter(x: number, t: number) {
    if (this.xPrev === null) { this.xPrev = x; this.tPrev = t; this.dxPrev = 0; return x; }
    const dt = Math.max(1e-3, (t - this.tPrev) / 1000); this.tPrev = t;
    const dx = (x - this.xPrev) / dt;
    const edx = this.dxPrev + this.alpha(this.dCutoff, dt) * (dx - this.dxPrev); this.dxPrev = edx;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const r = this.xPrev + this.alpha(cutoff, dt) * (x - this.xPrev); this.xPrev = r; return r;
  }
}

export interface Pose { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number }

/** Filters a full 6-DoF pose: One Euro on position (metres) and scale, adaptive slerp on rotation. */
export class PoseFilter {
  private px = new OneEuro(1.0, 6); private py = new OneEuro(1.0, 6); private pz = new OneEuro(0.6, 3);
  private s = new OneEuro(0.5, 0.5);
  private q: THREE.Quaternion | null = null; private tq = 0;
  reset() { this.px.reset(); this.py.reset(); this.pz.reset(); this.s.reset(); this.q = null; }
  filter(p: Pose, t: number): Pose {
    const position = new THREE.Vector3(this.px.filter(p.position.x, t), this.py.filter(p.position.y, t), this.pz.filter(p.position.z, t));
    const scale = this.s.filter(p.scale, t);
    if (!this.q) { this.q = p.quaternion.clone(); this.tq = t; }
    else {
      const dt = Math.max(1, t - this.tq); this.tq = t;
      const angle = this.q.angleTo(p.quaternion);          // radians
      const speed = angle / (dt / 1000);                    // rad/s
      // still → heavy smoothing, fast rotation → follow quickly
      const cutoff = 1.4 + 2.2 * speed;
      const tau = 1 / (2 * Math.PI * cutoff); const a = 1 / (1 + tau / (dt / 1000));
      this.q.slerp(p.quaternion, Math.min(1, a));
    }
    return { position, quaternion: this.q.clone(), scale };
  }
}
