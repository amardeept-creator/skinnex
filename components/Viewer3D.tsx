'use client';
import { useEffect, useRef, useState } from 'react';
import type { ARConfig, VariantOverrides, NailDesign } from '@/lib/ar/config';

export interface Viewer3DProps { url?: string | null; nails?: NailDesign | null; config?: ARConfig | null; overrides?: VariantOverrides | null; autoRotate?: boolean; reference?: boolean; zoom?: number; className?: string; style?: React.CSSProperties; onInfo?: (i: { materials: string[]; triangles: number; size: number[] }) => void; label?: string }

/** Lazy three.js viewer — three is only downloaded when the element scrolls into view. */
export function Viewer3D({ url, nails, config, overrides, autoRotate = true, reference = false, zoom, className, style, onInfo, label = 'Interactive 3D model' }: Viewer3DProps) {
  const el = useRef<HTMLDivElement>(null);
  const viewer = useRef<import('@/lib/ar/viewer').ModelViewer | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin: '200px' });
    if (el.current) io.observe(el.current); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!inView || !el.current) return; let dead = false;
    setState('loading');
    import('@/lib/ar/viewer').then(({ ModelViewer }) => {
      if (dead || !el.current) return;
      viewer.current = new ModelViewer(el.current, { autoRotate, reference, zoom, onReady: (i) => { setState('ready'); onInfo?.({ materials: i.materials, triangles: i.triangles, size: [i.size.x, i.size.y, i.size.z] }); }, onError: () => setState('error') });
      if (nails) { viewer.current.showNails(nails); setState('ready'); } else if (url) viewer.current.load(url, config, overrides); else setState('error');
    }).catch(() => setState('error'));
    return () => { dead = true; viewer.current?.dispose(); viewer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, url, reference]);
  useEffect(() => { viewer.current?.setOverrides(overrides || null); }, [overrides]);
  useEffect(() => { if (config && viewer.current) viewer.current.setConfig(config); }, [config]);
  useEffect(() => { if (nails && viewer.current) viewer.current.showNails(nails); }, [nails]);
  return (
    <div className={className} style={{ position: 'relative', ...style }} role="img" aria-label={label}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {state !== 'ready' && state !== 'error' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}><div className="row small muted"><span className="spinner-dot" />Loading 3D…</div></div>}
      {state === 'error' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} className="small muted">3D preview unavailable</div>}
    </div>
  );
}
