'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
export function AccountForm({ name, email }: { name: string; email: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); const r = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) }); const d = await r.json().catch(() => ({})); setMsg(r.ok ? { ok: true, t: 'Saved' } : { ok: false, t: d.issues?.[0]?.message || d.error || 'Could not save' }); }}>
      <b>Profile</b>
      <label className="field"><span className="label">Name</span><input className="input" name="name" defaultValue={name} required /></label>
      <label className="field"><span className="label">Email</span><input className="input" value={email} disabled /></label>
      <b style={{ marginTop: 8 }}>Change password</b>
      <label className="field"><span className="label">Current password</span><input className="input" name="currentPassword" type="password" autoComplete="current-password" /></label>
      <label className="field"><span className="label">New password</span><input className="input" name="newPassword" type="password" minLength={8} autoComplete="new-password" /></label>
      {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-danger'}`}>{msg.t}</div>}
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save</button>
    </form>
  );
}
export function ApiKeys({ enabled, keys }: { enabled: boolean; keys: { id: string; name: string; prefix: string; created: string; used: string }[] }) {
  const router = useRouter(); const [raw, setRaw] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <b>API keys</b>
      {!enabled ? <p className="small muted">API access is included in Business and Enterprise plans. <Link href="/developers" style={{ color: 'var(--iris)' }}>API docs</Link></p> : (<>
        <form className="row" onSubmit={async (e) => { e.preventDefault(); setErr(null); const name = String(new FormData(e.currentTarget).get('name')); const r = await fetch('/api/keys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }); const d = await r.json(); if (r.ok) { setRaw(d.key); router.refresh(); } else setErr(d.error); }}>
          <input className="input" name="name" placeholder="Key name, e.g. Shopify store" required maxLength={40} /><button className="btn btn-primary">Create</button></form>
        {raw && <div className="alert alert-success small" style={{ flexDirection: 'column' }}><b>Copy this key now — it won’t be shown again.</b><code style={{ wordBreak: 'break-all' }}>{raw}</code></div>}
        {err && <div className="err">{err}</div>}
        {keys.map(k => <div key={k.id} className="row small"><code>{k.prefix}…</code><span>{k.name}</span><span className="spacer" /><span className="faint">used {k.used}</span><button className="btn btn-ghost btn-sm" onClick={async () => { await fetch(`/api/keys/${k.id}`, { method: 'DELETE' }); router.refresh(); }}>Revoke</button></div>)}
      </>)}
    </div>
  );
}
