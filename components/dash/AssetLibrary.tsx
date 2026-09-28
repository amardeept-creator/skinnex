'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Uploader } from './Uploader';
import { Viewer3D } from '@/components/Viewer3D';
import { I } from '@/components/Icons';
interface Item { id: string; kind: string; url: string; name: string; size: string; saved: string | null; tris: number | null; materials: string[]; warnings: string[]; date: string; used: number }
export function AssetLibrary({ items }: { items: Item[] }) {
  const router = useRouter(); const [open, setOpen] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const del = async (id: string) => { if (!confirm('Delete this asset?')) return; const r = await fetch(`/api/assets/${id}`, { method: 'DELETE' }); const d = await r.json().catch(() => ({})); if (!r.ok) setErr(d.error || 'Could not delete'); else router.refresh(); };
  return (
    <div className="stack" style={{ gap: 14 }}>
      <Uploader kind="model" accept=".glb,.gltf" label="Upload a 3D model" help="GLB / GLTF 2.0" onDone={() => router.refresh()} />
      {err && <div className="alert alert-danger">{err}</div>}
      {items.length === 0 ? <p className="small muted">No uploads yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {items.map(a => (
            <div key={a.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-2)' }}>
                {a.kind === 'model' ? (open === a.id ? <Viewer3D url={a.url} style={{ position: 'absolute', inset: 0 }} /> : <button onClick={() => setOpen(a.id)} style={{ position: 'absolute', inset: 0, border: 0, background: 'none', display: 'grid', placeItems: 'center' }}><span className="row small"><I.cube size={20} />Load 3D preview</span></button>)
                  : a.kind === 'image' ? <img src={a.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} /> : <video src={a.url} style={{ width: '100%', height: '100%' }} muted />}
              </div>
              <div style={{ padding: 14 }} className="stack">
                <div className="row"><b className="small" style={{ flex: 1, wordBreak: 'break-all' }}>{a.name}</b><span className="badge">{a.kind}</span></div>
                <div className="tiny muted">{a.size}{a.tris ? ` · ${a.tris.toLocaleString()} tris` : ''} · {a.date}{a.used ? ` · used by ${a.used}` : ''}</div>
                {a.saved && <div className="tiny" style={{ color: 'var(--success)' }}>{a.saved}</div>}
                {a.warnings.map(w => <div key={w} className="tiny" style={{ color: 'var(--warn)' }}>⚠ {w}</div>)}
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => del(a.id)} disabled={a.used > 0} title={a.used ? 'In use by a Skinner' : undefined}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
