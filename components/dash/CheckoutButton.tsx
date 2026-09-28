'use client';
import { useState } from 'react';
export function CheckoutButton({ planId, disabled, contact, billing, highlight }: { planId: string; disabled: boolean; contact: boolean; billing: boolean; highlight: boolean }) {
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const cls = `btn btn-block ${highlight ? 'btn-iris' : 'btn-ghost'}`;
  if (disabled) return <span className={cls} aria-disabled="true">Current plan</span>;
  if (contact || !billing) return <a className={cls} href={`mailto:sales@skinify.app?subject=${encodeURIComponent(`SKINIFY ${planId} plan`)}`}>Contact SKINIFY</a>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className={cls} disabled={busy} onClick={async () => { setBusy(true); setMsg(null); const r = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planId }) }); const d = await r.json().catch(() => ({})); if (r.ok && d.url) window.location.href = d.url; else { setMsg(d.error || 'Checkout unavailable'); setBusy(false); } }}>{busy ? 'Redirecting…' : 'Choose plan'}</button>
      {msg && <span className="tiny" style={{ color: 'var(--danger)' }}>{msg}</span>}
    </div>
  );
}
