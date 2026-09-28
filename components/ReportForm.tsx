'use client';
import { useState } from 'react';
export function ReportForm({ productId, skinnerId }: { productId?: string; skinnerId?: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle'); const [msg, setMsg] = useState('');
  if (state === 'done') return <div className="alert alert-success">Thanks — your report was received.</div>;
  return (
    <form className="card card-pad stack" onSubmit={async (e) => { e.preventDefault(); setState('sending'); const f = new FormData(e.currentTarget);
      const r = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, skinnerId, reason: f.get('reason'), details: f.get('details') }) });
      if (r.ok) setState('done'); else { setState('error'); setMsg((await r.json().catch(() => ({}))).error || 'Could not send'); } }}>
      <label className="field"><span className="label">Reason</span><select name="reason" className="select" required><option value="misleading">Misleading product</option><option value="offensive">Offensive content</option><option value="ip">Copyright / trademark</option><option value="broken">AR doesn’t work</option><option value="other">Other</option></select></label>
      <label className="field"><span className="label">Details</span><textarea name="details" className="textarea" maxLength={1000} /></label>
      {state === 'error' && <div className="err">{msg}</div>}
      <button className="btn btn-primary" disabled={state === 'sending' || (!productId && !skinnerId)}>{state === 'sending' ? 'Sending…' : 'Send report'}</button>
    </form>
  );
}
