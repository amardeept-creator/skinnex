'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { I } from './Icons';
export function SearchBox({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial); const router = useRouter(); const sp = useSearchParams();
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(sp.toString()); if (q.trim()) n.set('q', q.trim()); else n.delete('q'); n.delete('page'); router.push(`/explore?${n}`); }} className="row" style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 999, padding: '0 6px 0 16px', height: 48, width: 'min(420px, 100%)' }}>
      <I.search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="gold ring, red nails, black sunglasses…" aria-label="Search Skinners" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', minWidth: 0 }} />
      <button className="btn btn-primary btn-sm" type="submit">Search</button>
    </form>
  );
}
