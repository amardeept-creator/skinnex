'use client';
import { useState } from 'react';
import { I } from './Icons';
import { track } from '@/lib/client/track';
export function ShareButton({ url, title, skinnerId, productId, className = 'btn btn-ghost', label = 'Share' }: { url: string; title: string; skinnerId?: string | null; productId?: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  const full = url.startsWith('http') ? url : (typeof window !== 'undefined' ? window.location.origin : '') + url;
  const go = async () => {
    try {
      if (navigator.share) { await navigator.share({ title, url: full }); track('share', { skinnerId, productId, meta: { kind: 'link', channel: 'native' } }); return; }
      await navigator.clipboard.writeText(full); setDone(true); setTimeout(() => setDone(false), 1600);
      track('share', { skinnerId, productId, meta: { kind: 'link', channel: 'copy' } });
    } catch { /* user cancelled */ }
  };
  return <button type="button" className={className} onClick={go}>{done ? <I.check size={18} /> : <I.share size={18} />}{label && <span>{done ? 'Link copied' : label}</span>}</button>;
}
