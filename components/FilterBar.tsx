'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import { I } from './Icons';

const COLORS: [string, string][] = [['gold', '#E3BE72'], ['silver', '#D9D9DE'], ['rose', '#EBB39F'], ['black', '#17141C'], ['white', '#FAFAFA'], ['pink', '#EFA3BA'], ['red', '#B3142B'], ['nude', '#D7B29D'], ['brown', '#6B4428'], ['green', '#1F8A5B'], ['purple', '#8E7CC3'], ['beige', '#D8C7A8'], ['grey', '#8A8A90']];

export function FilterBar({ categories, brands }: { categories: { slug: string; name: string; product_count: number }[]; brands: { slug: string; name: string }[] }) {
  const sp = useSearchParams(); const router = useRouter(); const path = usePathname(); const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(sp.toString()); if (v === null || v === '') n.delete(k); else n.set(k, v); start(() => router.replace(`${path}?${n.toString()}`, { scroll: false })); };
  const cat = sp.get('category'); const color = sp.get('color'); const ar = sp.get('ar') === '1';
  const activeCount = ['brand', 'color', 'min', 'max', 'ar'].filter(k => sp.get(k)).length;
  return (
    <div style={{ position: 'sticky', top: 'var(--header-h)', zIndex: 20, background: 'rgba(247,244,242,0.9)', backdropFilter: 'blur(12px)', padding: '10px 0', margin: '0 -4px' }} aria-busy={pending}>
      <div className="row" style={{ gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '2px 4px' }}>
        <button className="chip" aria-pressed={!cat} onClick={() => set('category', null)}>All</button>
        {categories.filter(c => c.product_count > 0).map(c => <button key={c.slug} className="chip" aria-pressed={cat === c.slug} onClick={() => set('category', cat === c.slug ? null : c.slug)}>{c.name}</button>)}
        <span className="spacer" />
        <button className="chip" onClick={() => setOpen(o => !o)} aria-expanded={open}><I.settings size={15} /> Filters{activeCount ? ` · ${activeCount}` : ''}</button>
        <select className="chip" aria-label="Sort" value={sp.get('sort') || 'trending'} onChange={(e) => set('sort', e.target.value)} style={{ paddingRight: 10 }}>
          <option value="trending">Trending</option><option value="new">New</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
        </select>
      </div>
      {open && (
        <div className="card card-pad" style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <div className="field"><span className="label">Brand</span>
            <select className="select" value={sp.get('brand') || ''} onChange={(e) => set('brand', e.target.value || null)}><option value="">All brands</option>{brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></div>
          <div className="field"><span className="label">Price (USD)</span>
            <div className="row"><input className="input" inputMode="numeric" placeholder="Min" defaultValue={sp.get('min') || ''} onBlur={(e) => set('min', e.target.value.replace(/\D/g, '') || null)} /><span className="faint">–</span><input className="input" inputMode="numeric" placeholder="Max" defaultValue={sp.get('max') || ''} onBlur={(e) => set('max', e.target.value.replace(/\D/g, '') || null)} /></div></div>
          <div className="field"><span className="label">Colour</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{COLORS.map(([n, h]) => <button key={n} title={n} aria-label={n} aria-pressed={color === n} onClick={() => set('color', color === n ? null : n)} style={{ width: 28, height: 28, borderRadius: 99, background: h, border: color === n ? '2px solid var(--iris)' : '1px solid var(--line-2)', boxShadow: color === n ? '0 0 0 3px rgba(110,76,245,.2)' : 'none' }} />)}</div></div>
          <div className="field"><span className="label">Availability</span>
            <div className="row"><button role="switch" aria-checked={ar} className="switch" onClick={() => set('ar', ar ? null : '1')} aria-label="AR available only" /><span className="small">AR available now</span></div></div>
          <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => start(() => router.replace(path + (cat ? `?category=${cat}` : '')))}>Clear filters</button></div>
        </div>
      )}
    </div>
  );
}
