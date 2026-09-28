'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Uploader } from './Uploader';
import { BrandMark } from '@/components/BrandMark';

export interface BrandValues { id?: string; name: string; tagline: string; description: string; website: string; logoUrl: string | null; accent: string; instagram: string }
const ACCENTS = ['#6E4CF5', '#C9A15B', '#2C3E50', '#E0567E', '#1F8A5B', '#B5651D', '#17141C', '#3A7BD5'];

export function BrandForm({ initial, next }: { initial?: BrandValues; next: string }) {
  const [v, setV] = useState<BrandValues>(initial ?? { name: '', tagline: '', description: '', website: '', logoUrl: null, accent: '#6E4CF5', instagram: '' });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const router = useRouter();
  const set = <K extends keyof BrandValues>(k: K, val: BrandValues[K]) => { setV(s => ({ ...s, [k]: val })); setSaved(false); };
  return (
    <form className="stack" style={{ gap: 18 }} onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const r = await fetch(initial?.id ? `/api/brands/${initial.id}` : '/api/brands', { method: initial?.id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
      const d = await r.json().catch(() => ({})); setBusy(false);
      if (!r.ok) { setErr(d.issues?.[0]?.message || d.error || 'Could not save'); return; }
      setSaved(true); router.push(next); router.refresh();
    }}>
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <BrandMark name={v.name || 'Brand'} accent={v.accent} logo={v.logoUrl} size={72} />
        <div style={{ flex: 1 }}><Uploader kind="image" accept="image/png,image/jpeg,image/webp" compact label={v.logoUrl ? 'Replace logo' : 'Upload logo'} help="Square PNG, JPG or WebP" onDone={(a) => set('logoUrl', a.url)} />
          {v.logoUrl && <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => set('logoUrl', null)}>Remove logo</button>}</div>
      </div>
      <label className="field"><span className="label">Brand name *</span><input className="input" value={v.name} onChange={(e) => set('name', e.target.value)} required maxLength={60} placeholder="e.g. Aurelle Fine Jewellery" /></label>
      <label className="field"><span className="label">Tagline</span><input className="input" value={v.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={120} placeholder="One line customers will see" /></label>
      <label className="field"><span className="label">Description</span><textarea className="textarea" value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <label className="field"><span className="label">Website</span><input className="input" value={v.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yourstore.com" inputMode="url" /></label>
        <label className="field"><span className="label">Instagram</span><input className="input" value={v.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@yourbrand" /></label>
      </div>
      <div className="field"><span className="label">Accent colour</span><div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{ACCENTS.map(c => <button type="button" key={c} aria-label={c} aria-pressed={v.accent === c} onClick={() => set('accent', c)} style={{ width: 32, height: 32, borderRadius: 99, background: c, border: v.accent === c ? '3px solid #fff' : 0, boxShadow: v.accent === c ? `0 0 0 2px ${c}` : 'none' }} />)}<input type="color" value={v.accent} onChange={(e) => set('accent', e.target.value.toUpperCase())} aria-label="Custom colour" style={{ width: 40, height: 32, border: 0, background: 'none' }} /></div></div>
      {err && <div className="alert alert-danger" role="alert">{err}</div>}
      <div className="row"><button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : initial?.id ? 'Save changes' : 'Create brand & continue'}</button>{saved && <span className="small" style={{ color: 'var(--success)' }}>Saved</span>}</div>
    </form>
  );
}
