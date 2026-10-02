import Link from 'next/link';
import { I } from '@/components/Icons';
import { Viewer3D } from '@/components/Viewer3D';
export const metadata = { title: 'For brands' };
const TYPES = [['Rings', 'Finger'], ['Nails', 'Hand'], ['Watches', 'Wrist'], ['Bracelets', 'Wrist'], ['Glasses', 'Face'], ['Earrings', 'Face'], ['Lip colour', 'Face'], ['Hats', 'Head'], ['Necklaces', 'Body'], ['Bags', 'Body'], ['Shoes', 'Feet'], ['Home decor', 'Room']];
export default function Brands() {
  return (
    <>
      <section className="hero"><div className="container hero-grid">
        <div>
          <div className="eyebrow">SKINIFY for brands</div>
          <h1 style={{ marginTop: 16, fontSize: 'clamp(44px, 7vw, 96px)' }}>Let customers<br /><span className="soft">try it first.</span></h1>
          <p className="hero-lede">Upload your product and 3D model, choose where it tracks, preview it live, publish — and share one link everywhere your customers are.</p>
          <div className="row" style={{ marginTop: 28, flexWrap: 'wrap' }}><Link href="/dashboard/skinners/new" className="btn btn-lg btn-primary">Create a Skinner</Link><Link href="/explore" className="btn btn-lg btn-ghost">Explore</Link></div>
          <p className="small faint" style={{ marginTop: 14 }}>No code. No app for your customers to install.</p>
        </div>
        <div className="hero-stage"><Viewer3D url="/seed/models/watch-meridian.glb" style={{ position: 'absolute', inset: 0 }} label="3D watch model" /><span className="tag badge badge-ar" style={{ top: 18, left: 18 }}><i />Your GLB, validated &amp; optimised</span></div>
      </div></section>
      <section className="container"><div className="steps3">
        {[['01', 'Create', 'Product info, images and a GLB/GLTF 3D model — or start from a SKINIFY base model.'], ['02', 'Configure', 'Pick the body part and anchor. Adjust scale, position and rotation with a live preview.'], ['03', 'Share', 'Publish to get a short link, a QR code for packaging and an embed for your store.']].map(([n, t, d]) => (
          <div key={n} className="card card-pad"><div className="eyebrow" style={{ color: 'var(--iris)' }}>{n}</div><h3 style={{ fontSize: 26, marginTop: 10 }}>{t}</h3><p className="muted" style={{ marginTop: 8 }}>{d}</p></div>
        ))}
      </div></section>
      <section className="section container">
        <h2 className="section-title">What can become a Skinner</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 22 }}>
          {TYPES.map(([t, b]) => <div key={t} className="card" style={{ padding: 16 }}><b>{t}</b><div className="tiny muted">{b} tracking</div></div>)}
        </div>
      </section>
      <section className="container"><div className="dark-band" style={{ padding: 'clamp(28px, 5vw, 60px)' }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}>One link. Every channel.</h2>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 20, gap: 10 }}>{['Instagram bio', 'WhatsApp', 'Your website', 'Email', 'Ads', 'QR on packaging', 'In-store display', 'TikTok'].map(c => <span key={c} className="link-pill" style={{ fontFamily: 'inherit' }}>{c}</span>)}</div>
        <div className="row" style={{ marginTop: 26, flexWrap: 'wrap' }}><Link href="/dashboard/skinners/new" className="btn btn-lg" style={{ background: '#fff', color: 'var(--ink)' }}>Create your first Skinner <I.arrow size={16} /></Link><Link href="/explore" className="btn btn-lg btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>Explore</Link></div>
      </div></section>
    </>
  );
}
