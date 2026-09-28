'use client';
import Link from 'next/link';
import { useFavorites } from '@/lib/client/favorites';
import { I } from './Icons';
export function SavedList() {
  const { favs, toggle } = useFavorites();
  if (!favs.length) return (
    <div className="card card-pad" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <span style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: 20, background: 'var(--blush)', color: '#c24d74' }}><I.heart size={28} /></span>
      <h2 style={{ fontSize: 26, marginTop: 16 }}>Nothing saved yet</h2>
      <p className="muted" style={{ marginTop: 8 }}>Tap the heart on any product to keep it here for later.</p>
      <Link href="/explore" className="btn btn-primary" style={{ marginTop: 20 }}>Explore Skinners</Link>
    </div>
  );
  return (
    <div className="p-grid">
      {favs.map(f => (
        <div key={f.id} className="p-card">
          <Link href={f.href} className="p-media">{f.image && <img className="main" src={f.image} alt="" />}</Link>
          <div className="p-body"><span className="p-brand">{f.brand}</span><Link href={f.href} className="p-name">{f.name}</Link>
            <div className="p-actions"><Link href={f.href} className="btn btn-sm btn-primary">View</Link><button className="btn btn-sm btn-ghost" onClick={() => toggle(f)}>Remove</button></div></div>
        </div>
      ))}
    </div>
  );
}
