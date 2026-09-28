'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter(); const sp = useSearchParams();
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const f = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.issues?.[0]?.message || d.error || 'Something went wrong'); setBusy(false); return; }
      const next = sp.get('next'); router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : d.next); router.refresh();
    }}>
      <div><h1 style={{ fontSize: 38 }}>{mode === 'login' ? 'Welcome back' : 'Create your brand account'}</h1>
        <p className="muted" style={{ marginTop: 8 }}>{mode === 'login' ? 'Sign in to your SKINIFY studio.' : 'Free 14-day trial. Shoppers never need an account — only brands do.'}</p></div>
      {mode === 'signup' && <label className="field"><span className="label">Your name</span><input className="input" name="name" required maxLength={80} autoComplete="name" /></label>}
      <label className="field"><span className="label">Email</span><input className="input" name="email" type="email" required autoComplete="email" /></label>
      <label className="field"><span className="label">Password</span><input className="input" name="password" type="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />{mode === 'signup' && <span className="help">At least 8 characters.</span>}</label>
      {err && <div className="alert alert-danger" role="alert">{err}</div>}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <p className="small muted" style={{ textAlign: 'center' }}>{mode === 'login' ? <>New to SKINIFY? <Link href="/signup" style={{ color: 'var(--iris)', fontWeight: 700 }}>Create an account</Link></> : <>Already have an account? <Link href="/login" style={{ color: 'var(--iris)', fontWeight: 700 }}>Sign in</Link></>}</p>
    </form>
  );
}
