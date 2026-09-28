'use client';
import { useRef, useState } from 'react';
import { uploadAsset, type Kind, type UploadedAsset } from '@/lib/client/upload';
import { I } from '@/components/Icons';
import { formatBytes } from '@/lib/format';

export function Uploader({ kind, accept, onDone, label, help, compact = false }: { kind: Kind; accept: string; onDone: (a: UploadedAsset) => void; label: string; help?: string; compact?: boolean }) {
  const inp = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false); const [p, setP] = useState<number | null>(null); const [err, setErr] = useState<string | null>(null); const [name, setName] = useState('');
  const go = async (f: File | undefined) => {
    if (!f) return; setErr(null); setName(`${f.name} · ${formatBytes(f.size)}`); setP(0.05);
    try { const a = await uploadAsset(f, kind, setP); onDone(a); } catch (e) { setErr((e as Error).message); } finally { setP(null); if (inp.current) inp.current.value = ''; }
  };
  return (
    <div>
      <div className={`drop${over ? ' over' : ''}`} style={compact ? { padding: 16 } : undefined} role="button" tabIndex={0}
        onClick={() => p === null && inp.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inp.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); go(e.dataTransfer.files[0]); }}>
        <input ref={inp} type="file" accept={accept} hidden onChange={(e) => go(e.target.files?.[0])} />
        {p === null ? (
          <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-sm)' }}>{kind === 'model' ? <I.cube size={20} /> : kind === 'video' ? <I.video size={20} /> : <I.upload size={20} />}</span>
            <b className="small">{label}</b>{help && <span className="tiny faint">{help}</span>}
          </div>
        ) : (
          <div className="stack" style={{ gap: 8 }}><span className="small">{kind === 'model' && p > 0.85 ? 'Validating & optimising model…' : 'Uploading…'} <span className="faint">{name}</span></span><div className="bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></div></div>
        )}
      </div>
      {err && <div className="err" style={{ marginTop: 8 }} role="alert">{err}</div>}
    </div>
  );
}
