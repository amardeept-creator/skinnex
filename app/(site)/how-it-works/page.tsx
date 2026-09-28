import { TRACKING_PROFILES } from '@/lib/ar/config';
export const metadata = { title: 'How SKINIFY AR works' };
const STACK = [
  ['Three.js (WebGL)', 'Renders the product with physically-based materials, an image-based environment, tone mapping and depth-only occluders (e.g. the finger hides the back of a ring).'],
  ['MediaPipe Tasks Vision', 'On-device hand (21 landmarks), face (478 landmarks + head pose matrix) and body pose (33 landmarks) tracking in WebAssembly with GPU acceleration where available.'],
  ['Skinner solvers', 'Convert landmarks into metric 6-DoF anchor poses per body part (finger, wrist, nails, eyes, ears, head, lips, neck, shoulder, torso, feet).'],
  ['Stabilisation', 'One-Euro filtering for position, adaptive slerp for rotation. When tracking drops, the last pose is held briefly, then faded out — the product never floats around.'],
  ['glTF 2.0 pipeline', 'Seller GLB/GLTF files are validated server-side, deduplicated, pruned and Meshopt-compressed, then streamed from a CDN and cached.'],
  ['WebXR (where supported)', 'Room placement is manual (drag/pinch) everywhere. WebXR plane hit-testing is a roadmap item for Android Chrome.'],
];
export default function How() {
  return (
    <div className="container" style={{ padding: '40px 0', maxWidth: 980 }}>
      <div className="eyebrow">Body-part AR tracking engine</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', marginTop: 8 }}>How a Skinner stays on you</h1>
      <p className="muted" style={{ marginTop: 12, fontSize: 16, maxWidth: 700 }}>A Skinner = product + 3D/AR asset + body-part tracking + real-time anchoring + a public AR experience. Tracking is an estimate from a single camera: it works well in good light with the body part clearly visible, and is not perfect.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 28 }}>{STACK.map(([t, d]) => <div key={t} className="card card-pad"><h3 style={{ fontSize: 19 }}>{t}</h3><p className="small muted" style={{ marginTop: 6 }}>{d}</p></div>)}</div>
      <h2 style={{ fontSize: 32, marginTop: 48 }}>Tracking profiles</h2>
      <div className="card" style={{ marginTop: 16 }}><div className="table-wrap"><table className="table"><thead><tr><th>Profile</th><th>Tracker</th><th>Anchor</th><th>Maturity</th><th>Notes</th></tr></thead><tbody>
        {TRACKING_PROFILES.map(p => <tr key={p.key}><td><b>{p.name}</b></td><td>{p.tracker}</td><td>{p.anchor}</td><td><span className={`badge ${p.maturity === 'stable' ? 'badge-success' : p.maturity === 'beta' ? 'badge-iris' : 'badge-warn'}`}>{p.maturity}</span></td><td className="small muted">{p.description}</td></tr>)}
      </tbody></table></div></div>
    </div>
  );
}
