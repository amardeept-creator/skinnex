'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { I } from '@/components/Icons';
import type { LiveState } from './StatusBadge';

export function SkinnerActions({ id, slug, state, compact = true }: { id: string; slug: string | null; state: LiveState; compact?: boolean }) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter(); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const act = async (action: string) => {
    setBusy(true); setMsg(null); setOpen(false);
    const r = action === 'delete' ? await fetch(`/api/skinners/${id}`, { method: 'DELETE' }) : await fetch(`/api/skinners/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(d.error || 'Action failed'); return; }
    if (action === 'duplicate') router.push(`/dashboard/skinners/${d.id}`); else if (action === 'delete') router.push('/dashboard/skinners');
    router.refresh();
  };
  const copy = async () => { if (!slug) return; await navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`); setMsg('Link copied'); setOpen(false); setTimeout(() => setMsg(null), 1500); };
  const published = state !== 'draft' && state !== 'unpublished';
  return (
    <div ref={ref} className="row" style={{ position: 'relative', gap: 6, justifyContent: 'flex-end' }}>
      {msg && <span className="tiny" style={{ color: msg === 'Link copied' ? 'var(--success)' : 'var(--danger)', maxWidth: 260 }}>{msg}</span>}
      {!compact && (state === 'draft' || state === 'unpublished') && <button className="btn btn-iris btn-sm" disabled={busy} onClick={() => act('publish')}>Publish</button>}
      {!compact && (state === 'link_expired') && <button className="btn btn-iris btn-sm" disabled={busy} onClick={() => act('renew')}>Renew link</button>}
      {slug && published && <button className="btn btn-ghost btn-sm btn-icon" onClick={copy} aria-label="Copy link" title="Copy link"><I.copy size={16} /></button>}
      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setOpen(o => !o)} aria-label="More actions" aria-expanded={open} disabled={busy}><I.more size={18} /></button>
      {open && (
        <div className="menu" role="menu">
          <Link href={`/dashboard/skinners/${id}`} role="menuitem"><I.settings size={16} />Edit</Link>
          <Link href={`/dashboard/skinners/${id}/preview`} role="menuitem"><I.camera size={16} />Preview in AR</Link>
          {(state === 'draft' || state === 'unpublished') && <button role="menuitem" onClick={() => act('publish')}><I.sparkle size={16} />Publish</button>}
          {published && <button role="menuitem" onClick={() => act('unpublish')}><I.eye size={16} />Unpublish</button>}
          {slug && <button role="menuitem" onClick={() => act('renew')}><I.refresh size={16} />Renew link</button>}
          {slug && <Link href={`/dashboard/links?skinner=${id}`} role="menuitem"><I.qr size={16} />Link, QR &amp; embed</Link>}
          <Link href={`/dashboard/analytics?skinner=${id}`} role="menuitem"><I.chart size={16} />Analytics</Link>
          <button role="menuitem" onClick={() => act('duplicate')}><I.copy size={16} />Duplicate</button>
          <button role="menuitem" className="danger" onClick={() => { if (confirm('Delete this Skinner? Its public link will stop working. This cannot be undone.')) act('delete'); }}><I.close size={16} />Delete</button>
        </div>
      )}
    </div>
  );
}
