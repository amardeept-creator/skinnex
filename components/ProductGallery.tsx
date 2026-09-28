'use client';
import { useState } from 'react';
import { Viewer3D } from './Viewer3D';
import type { ARConfig, NailDesign } from '@/lib/ar/config';
import { I } from './Icons';

export function ProductGallery({ images, modelUrl, nails, config, tint, name }: { images: { url: string; alt?: string }[]; modelUrl: string | null; nails: NailDesign | null; config: ARConfig | null; tint: string; name: string }) {
  const has3d = !!modelUrl || !!nails;
  const [tab, setTab] = useState<number | '3d'>(0);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 32, background: `radial-gradient(70% 60% at 50% 42%, #fff, ${tint})`, overflow: 'hidden', border: '1px solid var(--line)' }}>
        {tab === '3d' ? <Viewer3D url={modelUrl} nails={nails} config={config} style={{ position: 'absolute', inset: 0 }} label={`3D model of ${name}`} />
          : images[tab as number] ? <img src={images[tab as number].url} alt={images[tab as number].alt || name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '8%' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} className="muted">No image</div>}
        {tab === '3d' && <span className="badge badge-ar" style={{ position: 'absolute', top: 16, left: 16 }}><i />3D · drag to rotate · scroll to zoom</span>}
      </div>
      <div className="row" style={{ gap: 10 }}>
        {images.map((im, i) => (
          <button key={im.url} onClick={() => setTab(i)} aria-label={`Image ${i + 1}`} aria-pressed={tab === i} style={{ width: 72, height: 72, borderRadius: 16, border: tab === i ? '2px solid var(--ink)' : '1px solid var(--line-2)', background: tint, padding: 6 }}>
            <img src={im.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </button>
        ))}
        {has3d && <button onClick={() => setTab('3d')} aria-pressed={tab === '3d'} style={{ width: 72, height: 72, borderRadius: 16, border: tab === '3d' ? '2px solid var(--ink)' : '1px solid var(--line-2)', background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}><I.cube size={22} />3D</button>}
      </div>
    </div>
  );
}
