import Link from 'next/link';
import type { Plan } from '@/lib/server/entitlements';
import { formatPrice } from '@/lib/format';
import { I } from './Icons';
export function limitLines(p: Plan) {
  const l = p.limits; const n = (v: number | null, u: string) => v == null ? `Unlimited ${u}` : `${v} ${u}`;
  return [
    n(l.max_active_skinners, 'active Skinners'),
    l.link_validity_days ? `Links valid ${l.link_validity_days} days` : 'Links valid while subscribed',
    l.monthly_ar_sessions == null ? 'Unlimited AR sessions' : `${new Intl.NumberFormat('en-US').format(l.monthly_ar_sessions)} AR sessions / month`,
    `${l.storage_mb >= 1024 ? l.storage_mb / 1024 + ' GB' : l.storage_mb + ' MB'} asset storage · ${l.max_upload_mb} MB per file`,
    l.analytics === 'advanced' ? 'Advanced analytics (sources, devices, per-Skinner)' : 'Basic analytics',
    l.qr ? 'QR codes' : null, l.embed ? 'Website embed' : null, l.remove_branding ? 'Remove SKINIFY watermark' : null, l.api_access ? 'API access' : null,
  ].filter(Boolean) as string[];
}
export function PlanCards({ plans, current, action }: { plans: Plan[]; current?: string | null; action?: (p: Plan) => React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
      {plans.map(p => {
        const hl = p.id === 'pro';
        return (
          <div key={p.id} className="card card-pad stack" style={{ gap: 14, ...(hl ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}) }}>
            <div className="row"><b style={{ fontSize: 18 }}>{p.name}</b>{hl && <span className="badge badge-iris">Popular</span>}{current === p.id && <span className="badge badge-success">Current</span>}</div>
            <div><span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38 }}>{p.price_cents == null ? 'Custom' : p.price_cents === 0 ? 'Free' : formatPrice(p.price_cents, p.currency)}</span>{p.price_cents ? <span style={{ opacity: .6 }}> / {p.billing_interval}</span> : null}</div>
            <p className="small" style={{ opacity: .72 }}>{p.description}{p.trial_days ? ` ${p.trial_days}-day trial.` : ''}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>{limitLines(p).map(t => <li key={t} className="small row" style={{ gap: 8, alignItems: 'flex-start' }}><I.check size={16} style={{ flex: 'none', marginTop: 2, color: hl ? '#b9a8ff' : 'var(--iris)' }} />{t}</li>)}</ul>
            <div style={{ marginTop: 'auto' }}>{action ? action(p) : <Link href="/dashboard/skinners/new" className={`btn btn-block ${hl ? 'btn-iris' : 'btn-ghost'}`} style={hl ? {} : undefined}>{p.price_cents == null ? 'Create Skinner' : p.id === 'trial' ? 'Start creating' : `Start with ${p.name}`}</Link>}</div>
          </div>
        );
      })}
    </div>
  );
}
