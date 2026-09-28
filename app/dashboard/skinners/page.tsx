import Link from 'next/link';
import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { getEntitlement } from '@/lib/server/entitlements';
import { StatusBadge, liveState } from '@/components/dash/StatusBadge';
import { SkinnerActions } from '@/components/dash/SkinnerActions';
import { I } from '@/components/Icons';
import { formatDate, num } from '@/lib/format';
import { PROFILE_BY_KEY } from '@/lib/ar/config';

export default async function Skinners({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const u = await pageSeller(); const sp = await searchParams;
  const [e, rows] = await Promise.all([getEntitlement(u.sellerId), sql`
    select s.id, s.name, s.status, s.admin_disabled, s.tracking_profile, s.created_at, s.updated_at, s.published_at, p.images->0->>'url' as image, p.category_slug,
      l.slug, l.expires_at as link_expires,
      (select count(*)::int from analytics_events e where e.skinner_id = s.id and e.event = 'tryon') as tryons,
      (select count(*)::int from analytics_events e where e.skinner_id = s.id and e.event = 'product_view') as views,
      (select count(*)::int from analytics_events e where e.skinner_id = s.id and e.event = 'share') as shares
    from skinners s join products p on p.id = s.product_id left join public_links l on l.skinner_id = s.id where s.seller_id = ${u.sellerId} order by s.updated_at desc`]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withState = rows.map(r => ({ ...r, state: liveState(r as never, e.active) }) as Record<string, any> & { state: ReturnType<typeof liveState> });
  const list = sp.status ? withState.filter(r => sp.status === 'live' ? r.state === 'live' : sp.status === 'draft' ? r.state === 'draft' : r.state !== 'live' && r.state !== 'draft') : withState;
  const tabs = [['', 'All', withState.length], ['live', 'Live', withState.filter(r => r.state === 'live').length], ['draft', 'Drafts', withState.filter(r => r.state === 'draft').length], ['inactive', 'Inactive', withState.filter(r => r.state !== 'live' && r.state !== 'draft').length]] as const;
  return (
    <>
      <div className="dash-head"><div><h1>My Skinners</h1><p className="small muted" style={{ marginTop: 6 }}>{e.usage.totalSkinners}{e.limits?.max_skinners != null ? ` / ${e.limits.max_skinners}` : ''} Skinners · {e.usage.activeSkinners}{e.limits?.max_active_skinners != null ? ` / ${e.limits.max_active_skinners}` : ''} published</p></div><span className="spacer" /><Link href="/dashboard/skinners/new" className="btn btn-primary"><I.plus size={17} />Create Skinner</Link></div>
      <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>{tabs.map(([k, l, n]) => <Link key={k} href={k ? `?status=${k}` : '?'} className={`chip${(sp.status || '') === k ? ' active' : ''}`}>{l} · {n}</Link>)}</div>
      {list.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: 'center', padding: 56 }}><h2 style={{ fontSize: 24 }}>No Skinners here</h2><p className="muted" style={{ marginTop: 6 }}>Create a Skinner to turn a product into a shareable AR try-on.</p><Link href="/dashboard/skinners/new" className="btn btn-primary" style={{ marginTop: 16 }}>Create Skinner</Link></div>
      ) : (
        <div className="card table-wrap"><table className="table">
          <thead><tr><th>Skinner</th><th>Status</th><th>Type</th><th>Try-ons</th><th>Views</th><th>Shares</th><th>Link</th><th>Updated</th><th /></tr></thead>
          <tbody>{list.map(r => (
            <tr key={r.id}>
              <td><Link href={`/dashboard/skinners/${r.id}`} className="row" style={{ gap: 12 }}>{r.image ? <img className="thumb" src={r.image} alt="" /> : <span className="thumb" />}<span style={{ fontWeight: 700 }}>{r.name}</span></Link></td>
              <td><StatusBadge state={r.state} /></td>
              <td className="small">{PROFILE_BY_KEY[r.tracking_profile]?.name}</td>
              <td className="tabular">{num(r.tryons)}</td><td className="tabular">{num(r.views)}</td><td className="tabular">{num(r.shares)}</td>
              <td className="small">{r.slug ? <><code>/s/{r.slug}</code><div className="tiny faint">{r.link_expires ? `Expires ${formatDate(r.link_expires)}` : 'No expiry'}</div></> : <span className="faint">Publish to create</span>}</td>
              <td className="small muted">{formatDate(r.updated_at)}</td>
              <td><SkinnerActions id={r.id} slug={r.slug} state={r.state} /></td>
            </tr>))}</tbody>
        </table></div>
      )}
    </>
  );
}
