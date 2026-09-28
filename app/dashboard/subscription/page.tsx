import { pageSeller } from '@/lib/server/auth';
import { getEntitlement, listPlans } from '@/lib/server/entitlements';
import { PlanCards } from '@/components/PlanCards';
import { CheckoutButton } from '@/components/dash/CheckoutButton';
import { formatDate, formatBytes, num } from '@/lib/format';
import { stripeEnabled } from '@/lib/server/stripe';

export default async function Subscription({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const u = await pageSeller(); const sp = await searchParams;
  const [e, plans] = await Promise.all([getEntitlement(u.sellerId), listPlans()]);
  const l = e.limits; const billing = stripeEnabled();
  const usage: [string, number, number | null, (n: number) => string][] = [
    ['Active Skinners', e.usage.activeSkinners, l?.max_active_skinners ?? null, num], ['Total Skinners', e.usage.totalSkinners, l?.max_skinners ?? null, num],
    ['AR sessions this month', e.usage.arSessionsMonth, l?.monthly_ar_sessions ?? null, num], ['Asset storage', e.usage.storageBytes, l ? l.storage_mb * 1048576 : null, formatBytes],
  ];
  return (
    <>
      <div className="dash-head"><div><h1>Subscription</h1></div></div>
      {sp.checkout === 'success' && <div className="alert alert-success" style={{ marginBottom: 16 }}>Checkout completed. Your plan activates as soon as Stripe confirms the payment (usually within seconds).</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 16 }}>
        <div className="card card-pad stack" style={{ gap: 10 }}>
          <div className="row"><span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32 }}>{e.plan?.name ?? 'No plan'}</span><span className={`badge ${e.active ? 'badge-success' : 'badge-danger'}`}>{e.sub?.status ?? 'none'}</span></div>
          <div className="small muted">
            {e.sub?.status === 'trialing' && e.sub.expires_at && <>Trial ends {formatDate(e.sub.expires_at)}.</>}
            {e.sub?.status !== 'trialing' && e.sub?.expires_at && <>{e.active ? 'Current period ends' : 'Ended'} {formatDate(e.sub.expires_at)}.</>}
            {e.sub && !e.sub.expires_at && e.active && <>No end date.</>}
            {' '}Billing: {e.sub?.provider === 'stripe' ? 'Stripe' : e.sub?.provider === 'manual' ? 'assigned by SKINIFY' : 'none (trial)'}.
          </div>
          {!e.active && <div className="alert alert-danger small">Your Skinners are inactive. Customers opening your links see a polite “currently inactive” page. Your products, 3D assets and settings are kept — renew to bring everything back instantly.</div>}
        </div>
        <div className="card card-pad stack" style={{ gap: 12 }}>
          <b>Usage</b>
          {usage.map(([k, v, max, f]) => <div key={k}><div className="row small"><span>{k}</span><span className="spacer" /><span className="tabular">{f(v)}{max != null ? ` / ${f(max)}` : ' · unlimited'}</span></div>{max != null && <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%` }} /></div>}</div>)}
        </div>
      </div>
      <h2 style={{ fontSize: 26, margin: '32px 0 16px' }}>{e.active ? 'Change plan' : 'Renew'}</h2>
      {!billing && <div className="alert alert-info small" style={{ marginBottom: 16 }}>Online card payments aren’t enabled on this deployment yet (no Stripe keys configured). SKINIFY will not show a fake “payment successful”. To upgrade now, contact the SKINIFY team — an admin can assign your plan.</div>}
      <PlanCards plans={plans.filter(p => p.id !== 'trial')} current={e.plan?.id} action={(p) => <CheckoutButton planId={p.id} disabled={p.id === e.plan?.id && e.active} contact={p.price_cents == null} billing={billing} highlight={p.id === 'pro'} />} />
    </>
  );
}
