import Link from 'next/link';
import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { sellerSummary } from '@/lib/server/analytics';
import { getEntitlement } from '@/lib/server/entitlements';
import { Stat } from '@/components/dash/Stat';
import { MiniChart } from '@/components/dash/MiniChart';
import { StatusBadge, liveState } from '@/components/dash/StatusBadge';
import { I } from '@/components/Icons';
import { formatDate, num } from '@/lib/format';

export default async function Overview() {
  const u = await pageSeller();
  const [s, e, skinners] = await Promise.all([
    sellerSummary(u.sellerId, 30), getEntitlement(u.sellerId),
    sql`select s.id, s.name, s.status, s.admin_disabled, l.slug, l.expires_at as link_expires, p.images->0->>'url' as image from skinners s join products p on p.id = s.product_id left join public_links l on l.skinner_id = s.id where s.seller_id = ${u.sellerId} order by s.updated_at desc`,
  ]);
  const t = s.totals;
  const expiring = skinners.filter(k => k.link_expires && new Date(k.link_expires).getTime() < Date.now() + 14 * 864e5).slice(0, 5);
  const live = skinners.filter(k => liveState(k as never, e.active) === 'live').length;
  return (
    <>
      <div className="dash-head"><div><div className="eyebrow">Last 30 days · real recorded events</div><h1 style={{ marginTop: 6 }}>Hi {u.name.split(' ')[0]}</h1></div><span className="spacer" /><Link href="/dashboard/skinners/new" className="btn btn-primary"><I.plus size={17} />Create Skinner</Link></div>
      {skinners.length === 0 && (
        <div className="card card-pad" style={{ background: 'var(--aura), var(--surface)', marginBottom: 20 }}>
          <h2 style={{ fontSize: 28 }}>Create your first Skinner</h2>
          <p className="muted" style={{ marginTop: 8, maxWidth: 520 }}>Add a product, attach a 3D model (or start from a SKINIFY base model), choose the body part, preview it live, then publish to get your link and QR code.</p>
          <Link href="/dashboard/skinners/new" className="btn btn-primary btn-lg" style={{ marginTop: 18 }}>Start <I.arrow size={16} /></Link>
        </div>
      )}
      <div className="stats">
        <Stat k="Active Skinners" v={live} sub={e.limits?.max_active_skinners != null ? `of ${e.limits.max_active_skinners} on your plan` : 'Unlimited on your plan'} />
        <Stat k="Total try-ons" v={t.tryons} sub="≥2s of stable tracking" />
        <Stat k="Link clicks" v={t.link_clicks} />
        <Stat k="Shares" v={t.shares} />
        <Stat k="Product views" v={t.product_views} />
        <Stat k="Buy clicks" v={t.buy_clicks} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16, marginTop: 16 }}>
        <div className="card card-pad"><div className="row"><b>Activity</b><span className="spacer" /><Link href="/dashboard/analytics" className="small" style={{ color: 'var(--iris)', fontWeight: 700 }}>Full analytics →</Link></div>
          <div style={{ marginTop: 14 }}><MiniChart data={s.daily as never} keys={[{ key: 'launches', label: 'Skinner opens', color: '#6E4CF5' }, { key: 'tryons', label: 'Try-ons', color: '#E0567E' }]} /></div></div>
        <div className="card card-pad">
          <b>Top Skinners</b>
          {s.top.length === 0 ? <p className="small faint" style={{ marginTop: 12 }}>No Skinners yet.</p> : (
            <div className="stack" style={{ gap: 10, marginTop: 12 }}>{s.top.slice(0, 5).map(k => <Link key={k.id} href={`/dashboard/skinners/${k.id}`} className="row">{k.image && <img className="thumb" src={k.image} alt="" />}<span style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.name}</span><span className="small muted tabular">{num(k.tryons)} try-ons · {num(k.launches)} opens</span></Link>)}</div>
          )}
        </div>
        <div className="card card-pad">
          <div className="row"><b>Subscription</b><span className="spacer" /><Link href="/dashboard/subscription" className="small" style={{ color: 'var(--iris)', fontWeight: 700 }}>Manage →</Link></div>
          <div className="row" style={{ marginTop: 12, gap: 10 }}><span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{e.plan?.name ?? 'None'}</span><span className={`badge ${e.active ? 'badge-success' : 'badge-danger'}`}>{e.sub?.status ?? 'none'}</span></div>
          <p className="small muted" style={{ marginTop: 6 }}>{e.sub?.expires_at ? `${e.active ? 'Renews / ends' : 'Ended'} ${formatDate(e.sub.expires_at)}` : 'No end date'}</p>
          <p className="small muted" style={{ marginTop: 4 }}>{num(e.usage.arSessionsMonth)} AR sessions this month{e.limits?.monthly_ar_sessions != null ? ` of ${num(e.limits.monthly_ar_sessions)}` : ''}</p>
        </div>
        <div className="card card-pad">
          <b>Link expiry</b>
          {expiring.length === 0 ? <p className="small faint" style={{ marginTop: 12 }}>No links expire in the next 14 days.</p> : <div className="stack" style={{ gap: 10, marginTop: 12 }}>{expiring.map(k => <Link key={k.id} href={`/dashboard/skinners/${k.id}`} className="row"><span style={{ flex: 1, fontWeight: 600 }}>{k.name}</span><StatusBadge state={liveState(k as never, e.active)} /><span className="small muted">{formatDate(k.link_expires)}</span></Link>)}</div>}
        </div>
      </div>
      {skinners.length > 0 && <p className="tiny faint" style={{ marginTop: 18 }}>All numbers come from real events recorded by SKINIFY (seller previews are excluded). Nothing here is sample data.</p>}
    </>
  );
}
