'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { I } from './Icons';
import { formatPrice, CATEGORY_TINT } from '@/lib/format';

interface Hit { id: string; slug: string; name: string; brand_name: string; brand_slug: string; image: string | null; price_cents: number | null; currency: string; link_slug: string | null; category_slug: string }
const SUGGEST = ['gold ring', 'acrylic nails', 'black sunglasses', 'pearl earrings', 'watch', 'red lipstick', 'party jewellery', 'chrome nails'];

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Hit[] | null>(null); const [loading, setLoading] = useState(false);
  const inp = useRef<HTMLInputElement>(null); const router = useRouter();
  useEffect(() => { inp.current?.focus(); const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', esc); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; }; }, [onClose]);
  useEffect(() => {
    if (!q.trim()) { setHits(null); return; }
    setLoading(true); const ctl = new AbortController();
    const t = setTimeout(() => fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal: ctl.signal }).then(r => r.json()).then(d => { setHits(d.items); setLoading(false); }).catch(() => {}), 160);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  const go = () => { if (q.trim()) { router.push(`/explore?q=${encodeURIComponent(q.trim())}`); onClose(); } };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ placeItems: 'start center', paddingTop: '8vh' }}>
      <div className="modal" role="dialog" aria-label="Search" style={{ width: 'min(680px, 100%)' }}>
        <form onSubmit={(e) => { e.preventDefault(); go(); }} className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <I.search size={20} />
          <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, brands, colours…" aria-label="Search" style={{ flex: 1, border: 0, outline: 0, fontSize: 18, background: 'transparent', minWidth: 0 }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Esc</button>
        </form>
        <div style={{ padding: 12, minHeight: 220 }}>
          {!q && (
            <div style={{ padding: 8 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Popular searches</div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{SUGGEST.map(s => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}</div>
            </div>
          )}
          {q && loading && !hits && <div className="stack" style={{ padding: 8 }}>{[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}</div>}
          {hits && hits.length === 0 && <div style={{ padding: 28, textAlign: 'center' }} className="muted">No Skinners match “{q}”. Try a colour, category or brand.</div>}
          {hits && hits.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {hits.map(h => (
                <li key={h.id} className="row" style={{ padding: 8, borderRadius: 14 }}>
                  <Link href={`/p/${h.brand_slug}/${h.slug}`} onClick={onClose} className="row" style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ width: 56, height: 56, borderRadius: 12, background: CATEGORY_TINT[h.category_slug], flex: 'none', display: 'grid', placeItems: 'center' }}>{h.image && <img src={h.image} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />}</span>
                    <span style={{ minWidth: 0 }}><span className="tiny faint" style={{ fontWeight: 700 }}>{h.brand_name}</span><br /><span style={{ fontWeight: 700 }}>{h.name}</span> <span className="small muted">{formatPrice(h.price_cents, h.currency)}</span></span>
                  </Link>
                  {h.link_slug && <Link href={`/s/${h.link_slug}?src=discover`} onClick={onClose} className="btn btn-sm try-btn"><span className="lens" />Try</Link>}
                </li>
              ))}
              <li style={{ padding: 8 }}><button className="btn btn-ghost btn-block" onClick={go}>See all results <I.arrow size={16} /></button></li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
