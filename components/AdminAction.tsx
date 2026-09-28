'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export function AdminAction({ body, label, confirmText, className = 'btn btn-ghost btn-sm', prompt }: { body: Record<string, unknown>; label: string; confirmText?: string; className?: string; prompt?: { field: string; text: string } }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  return (<>
    <button className={className} disabled={busy} onClick={async () => {
      if (confirmText && !confirm(confirmText)) return;
      const extra: Record<string, unknown> = {};
      if (prompt) { const v = window.prompt(prompt.text); if (v === null) return; extra[prompt.field] = v; }
      setBusy(true); setErr(null);
      const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, ...extra }) });
      setBusy(false); if (!r.ok) setErr((await r.json().catch(() => ({}))).error || 'Failed'); else router.refresh();
    }}>{busy ? '…' : label}</button>{err && <span className="tiny err">{err}</span>}</>);
}
export function PlanEditor({ plan }: { plan: { id: string; name: string; price_cents: number | null; stripe_price_id: string | null; is_public: boolean; active: boolean; limits: Record<string, unknown> } }) {
  const router = useRouter(); const [txt, setTxt] = useState(JSON.stringify(plan.limits, null, 2)); const [price, setPrice] = useState(plan.price_cents == null ? '' : String(plan.price_cents / 100));
  const [sp, setSp] = useState(plan.stripe_price_id || ''); const [pub, setPub] = useState(plan.is_public); const [act, setAct] = useState(plan.active); const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="card card-pad stack" style={{ gap: 10 }}>
      <div className="row"><b>{plan.name}</b><code className="tiny faint">{plan.id}</code></div>
      <label className="field"><span className="label">Price (USD / month, blank = contact sales)</span><input className="input" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      <label className="field"><span className="label">Stripe price ID</span><input className="input" value={sp} onChange={(e) => setSp(e.target.value)} placeholder="price_…" /></label>
      <div className="row small"><label className="row" style={{ gap: 6 }}><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} />Public</label><label className="row" style={{ gap: 6 }}><input type="checkbox" checked={act} onChange={(e) => setAct(e.target.checked)} />Active</label></div>
      <label className="field"><span className="label">Limits (JSON)</span><textarea className="textarea" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, minHeight: 220 }} value={txt} onChange={(e) => setTxt(e.target.value)} /></label>
      <div className="row"><button className="btn btn-primary btn-sm" onClick={async () => { setMsg(null); let limits; try { limits = JSON.parse(txt); } catch { setMsg('Invalid JSON'); return; }
        const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'plan_update', id: plan.id, price_cents: price === '' ? null : Math.round(Number(price) * 100), stripe_price_id: sp || null, is_public: pub, active: act, limits }) });
        const d = await r.json().catch(() => ({})); setMsg(r.ok ? 'Saved' : d.issues?.[0] ? `${d.issues[0].path}: ${d.issues[0].message}` : d.error); if (r.ok) router.refresh(); }}>Save plan</button>{msg && <span className="small">{msg}</span>}</div>
    </div>
  );
}
