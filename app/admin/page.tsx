import Link from 'next/link';
import { pageAdmin } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { listPlans } from '@/lib/server/entitlements';
import { AdminAction, PlanEditor } from '@/components/AdminAction';
import { Logo } from '@/components/Logo';
import { Stat } from '@/components/dash/Stat';
import { formatDate, formatBytes, num } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };
const TABS = ['overview', 'sellers', 'brands', 'skinners', 'assets', 'reports', 'plans', 'categories', 'users'] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await pageAdmin(); const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab || '') ? sp.tab! : 'overview';
  const q = (sp.q || '').trim().toLowerCase().slice(0, 60); const like = `%${q}%`;
  return (
    <div style={{ minHeight: '100dvh' }}>
      <header className="site-header scrolled"><div className="container inner"><Link href="/"><Logo /></Link><span className="badge badge-dark">Admin</span><span className="spacer" /><Link href="/dashboard" className="btn btn-ghost btn-sm">Studio</Link></div></header>
      <div className="container" style={{ padding: '24px 0 60px' }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>{TABS.map(t => <Link key={t} href={`/admin?tab=${t}`} className={`chip${tab === t ? ' active' : ''}`} style={{ textTransform: 'capitalize' }}>{t}</Link>)}</div>
        {tab !== 'overview' && tab !== 'plans' && <form className="row" style={{ marginBottom: 16, maxWidth: 420 }}><input type="hidden" name="tab" value={tab} /><input className="input" name="q" defaultValue={q} placeholder={`Search ${tab}…`} /><button className="btn btn-primary">Search</button></form>}
        {tab === 'overview' && <Overview />}
        {tab === 'sellers' && <Sellers like={like} />}
        {tab === 'brands' && <Brands like={like} />}
        {tab === 'skinners' && <Skinners like={like} />}
        {tab === 'assets' && <Assets like={like} />}
        {tab === 'reports' && <Reports />}
        {tab === 'plans' && <Plans />}
        {tab === 'categories' && <Categories />}
        {tab === 'users' && <Users like={like} />}
      </div>
    </div>
  );
}

async function Overview() {
  const [c] = await sql`select (select count(*)::int from sellers) as sellers, (select count(*)::int from brands) as brands, (select count(*)::int from products) as products,
    (select count(*)::int from skinners) as skinners, (select count(*)::int from live_skinners) as live, (select count(*)::int from reports where status = 'open') as reports,
    (select count(*)::int from subscriptions where status in ('trialing','active','past_due') and (expires_at is null or expires_at > now())) as active_subs,
    (select coalesce(sum(bytes),0)::bigint from ar_assets where status = 'ready') as storage`;
  const [e] = await sql`select count(*) filter (where event = 'skinner_launch')::int as launches, count(*) filter (where event = 'tryon')::int as tryons, count(*) filter (where event = 'share')::int as shares, count(*) filter (where event = 'ar_error')::int as errors, count(*) filter (where event = 'camera_denied')::int as denied from analytics_events where created_at > now() - interval '30 days'`;
  return (<>
    <div className="stats"><Stat k="Sellers" v={c.sellers} /><Stat k="Brands" v={c.brands} /><Stat k="Products" v={c.products} /><Stat k="Skinners" v={c.skinners} sub={`${c.live} live`} /><Stat k="Active subscriptions" v={c.active_subs} /><Stat k="Open reports" v={c.reports} /><Stat k="Asset storage" v={formatBytes(Number(c.storage))} /></div>
    <h2 style={{ fontSize: 22, margin: '26px 0 12px' }}>Platform activity · 30 days (real events)</h2>
    <div className="stats"><Stat k="Skinner opens" v={e.launches} /><Stat k="Try-ons" v={e.tryons} /><Stat k="Shares" v={e.shares} /><Stat k="AR errors" v={e.errors} /><Stat k="Camera denied" v={e.denied} /></div>
  </>);
}
async function Sellers({ like }: { like: string }) {
  const [rows, plans] = await Promise.all([sql`select se.id, se.status, se.is_demo, se.created_at, u.email, u.name, sub.plan_id, sub.status as sub_status, sub.expires_at, (select count(*)::int from skinners where seller_id = se.id) as skinners
    from sellers se join users u on u.id = se.user_id left join subscriptions sub on sub.seller_id = se.id where lower(u.email) like ${like} or lower(u.name) like ${like} order by se.created_at desc limit 200`, listPlans(true)]);
  return <div className="card table-wrap"><table className="table"><thead><tr><th>Seller</th><th>Status</th><th>Plan</th><th>Skinners</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{rows.map(r => (
    <tr key={r.id}><td><b>{r.name}</b>{r.is_demo && <span className="badge" style={{ marginLeft: 6 }}>demo</span>}<div className="tiny faint">{r.email}</div></td>
      <td><span className={`badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
      <td className="small">{r.plan_id ?? '—'} · {r.sub_status ?? 'none'}<div className="tiny faint">{r.expires_at ? `ends ${formatDate(r.expires_at)}` : 'no end date'}</div></td><td>{r.skinners}</td><td className="small muted">{formatDate(r.created_at)}</td>
      <td><div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
        <AdminAction body={{ op: 'seller_status', id: r.id, status: r.status === 'active' ? 'suspended' : 'active' }} label={r.status === 'active' ? 'Suspend' : 'Reactivate'} confirmText={r.status === 'active' ? 'Suspend this seller? All their Skinners go offline.' : undefined} />
        {plans.filter(p => p.id !== 'trial').map(p => <AdminAction key={p.id} body={{ op: 'assign_plan', id: r.id, planId: p.id, days: 30 }} label={`${p.name} 30d`} />)}
        <AdminAction body={{ op: 'expire_sub', id: r.id }} label="Expire now" confirmText="Expire this subscription now? Skinners become inactive (nothing is deleted)." />
      </div></td></tr>))}</tbody></table></div>;
}
async function Brands({ like }: { like: string }) {
  const rows = await sql`select b.id, b.name, b.slug, b.status, b.is_featured, u.email from brands b join sellers se on se.id = b.seller_id join users u on u.id = se.user_id where lower(b.name) like ${like} or b.slug like ${like} order by b.created_at desc limit 200`;
  return <div className="card table-wrap"><table className="table"><thead><tr><th>Brand</th><th>Owner</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(r => (
    <tr key={r.id}><td><Link href={`/b/${r.slug}`} style={{ fontWeight: 700 }}>{r.name}</Link>{r.is_featured && <span className="badge badge-iris" style={{ marginLeft: 6 }}>featured</span>}</td><td className="small">{r.email}</td><td><span className={`badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
      <td className="row" style={{ gap: 4 }}><AdminAction body={{ op: 'brand_feature', id: r.id, featured: !r.is_featured }} label={r.is_featured ? 'Unfeature' : 'Feature'} /><AdminAction body={{ op: 'brand_status', id: r.id, status: r.status === 'active' ? 'disabled' : 'active' }} label={r.status === 'active' ? 'Disable' : 'Enable'} /></td></tr>))}</tbody></table></div>;
}
async function Skinners({ like }: { like: string }) {
  const rows = await sql`select s.id, s.name, s.status, s.admin_disabled, s.disabled_reason, s.tracking_profile, p.id as product_id, p.status as p_status, p.is_featured, b.name as brand, l.slug,
    (select count(*)::int from reports r where r.skinner_id = s.id or r.product_id = p.id) as reports
    from skinners s join products p on p.id = s.product_id join brands b on b.id = s.brand_id left join public_links l on l.skinner_id = s.id where lower(s.name) like ${like} or lower(b.name) like ${like} order by reports desc, s.updated_at desc limit 300`;
  return <div className="card table-wrap"><table className="table"><thead><tr><th>Skinner / product</th><th>Brand</th><th>Status</th><th>Reports</th><th>Actions</th></tr></thead><tbody>{rows.map(r => (
    <tr key={r.id}><td><b>{r.name}</b><div className="tiny faint">{r.tracking_profile}{r.slug ? ` · /s/${r.slug}` : ''}</div></td><td className="small">{r.brand}</td>
      <td className="small"><span className="badge">{r.status}</span> {r.admin_disabled && <span className="badge badge-danger" title={r.disabled_reason}>disabled</span>} {r.p_status !== 'active' && <span className="badge badge-warn">product {r.p_status}</span>}</td>
      <td>{r.reports ? <span className="badge badge-danger">{r.reports}</span> : 0}</td>
      <td className="row" style={{ gap: 4, flexWrap: 'wrap' }}>{r.slug && <a className="btn btn-ghost btn-sm" href={`/s/${r.slug}`} target="_blank" rel="noreferrer">Open</a>}
        {r.admin_disabled ? <AdminAction body={{ op: 'skinner_disable', id: r.id, disabled: false }} label="Re-enable" /> : <AdminAction body={{ op: 'skinner_disable', id: r.id, disabled: true }} label="Disable" prompt={{ field: 'reason', text: 'Reason shown to the seller:' }} className="btn btn-danger btn-sm" />}
        <AdminAction body={{ op: 'product_status', id: r.product_id, status: r.p_status === 'disabled' ? 'active' : 'disabled' }} label={r.p_status === 'disabled' ? 'Enable product' : 'Disable product'} />
        <AdminAction body={{ op: 'product_feature', id: r.product_id, featured: !r.is_featured }} label={r.is_featured ? 'Unfeature' : 'Feature'} /></td></tr>))}</tbody></table></div>;
}
async function Assets({ like }: { like: string }) {
  const rows = await sql`select a.id, a.kind, a.url, a.original_filename, a.bytes, a.is_template, a.created_at, a.meta->>'triangles' as tris, u.email from ar_assets a left join sellers se on se.id = a.seller_id left join users u on u.id = se.user_id
    where a.status = 'ready' and (lower(coalesce(a.original_filename,'')) like ${like} or lower(coalesce(u.email,'')) like ${like}) order by a.created_at desc limit 200`;
  return <div className="card table-wrap"><table className="table"><thead><tr><th>File</th><th>Kind</th><th>Owner</th><th>Size</th><th>Triangles</th><th>Uploaded</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><a href={r.url} target="_blank" rel="noreferrer" className="small" style={{ fontWeight: 700 }}>{r.original_filename}</a></td><td>{r.kind}{r.is_template && <span className="badge badge-iris" style={{ marginLeft: 6 }}>base</span>}</td><td className="small">{r.email ?? 'SKINIFY'}</td><td className="small">{formatBytes(r.bytes)}</td><td className="small">{r.tris ? num(Number(r.tris)) : '—'}</td><td className="small muted">{formatDate(r.created_at)}</td></tr>)}</tbody></table></div>;
}
async function Reports() {
  const rows = await sql`select r.*, p.name as product, s.name as skinner, l.slug from reports r left join products p on p.id = r.product_id left join skinners s on s.id = r.skinner_id left join public_links l on l.skinner_id = r.skinner_id order by (r.status = 'open') desc, r.created_at desc limit 200`;
  if (!rows.length) return <div className="card card-pad muted">No reports. Customers can report products from the product page.</div>;
  return <div className="card table-wrap"><table className="table"><thead><tr><th>Item</th><th>Reason</th><th>Details</th><th>Status</th><th>Date</th><th /></tr></thead><tbody>{rows.map(r => (
    <tr key={r.id}><td className="small"><b>{r.skinner || r.product}</b></td><td><span className="badge badge-warn">{r.reason}</span></td><td className="small muted" style={{ maxWidth: 320 }}>{r.details}</td><td><span className="badge">{r.status}</span></td><td className="small muted">{formatDate(r.created_at)}</td>
      <td className="row" style={{ gap: 4 }}><AdminAction body={{ op: 'report_status', id: Number(r.id), status: 'resolved' }} label="Resolve" /><AdminAction body={{ op: 'report_status', id: Number(r.id), status: 'dismissed' }} label="Dismiss" /></td></tr>))}</tbody></table></div>;
}
async function Plans() {
  const plans = await listPlans(true);
  return (<><p className="small muted" style={{ marginBottom: 14 }}>Pricing and limits are data, not code. Changes apply immediately to every seller on the plan. Paid checkout requires STRIPE_SECRET_KEY and a Stripe price ID per plan.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>{plans.map(p => <PlanEditor key={p.id} plan={p as never} />)}</div></>);
}
async function Categories() {
  const rows = await sql`select c.*, (select count(*)::int from products p where p.category_slug = c.slug) as n from categories c order by sort`;
  return <div className="card table-wrap"><table className="table"><thead><tr><th>Category</th><th>Slug</th><th>Default tracking</th><th>Products</th><th>Active</th><th /></tr></thead><tbody>{rows.map(r => (
    <tr key={r.slug}><td><b>{r.name}</b><div className="tiny faint">{r.description}</div></td><td><code>{r.slug}</code></td><td className="small">{r.default_profile ?? '—'}</td><td>{r.n}</td><td>{r.active ? 'yes' : 'no'}</td>
      <td><AdminAction body={{ op: 'category_upsert', slug: r.slug, name: r.name, description: r.description, active: !r.active, default_profile: r.default_profile }} label={r.active ? 'Hide' : 'Show'} /></td></tr>))}</tbody></table></div>;
}
async function Users({ like }: { like: string }) {
  const rows = await sql`select u.id, u.email, u.name, u.role, u.status, u.created_at, (a.user_id is not null) as admin from users u left join admin_users a on a.user_id = u.id where lower(u.email) like ${like} or lower(u.name) like ${like} order by u.created_at desc limit 200`;
  return <div className="card table-wrap"><table className="table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th /></tr></thead><tbody>{rows.map(r => (
    <tr key={r.id}><td><b>{r.name}</b><div className="tiny faint">{r.email}</div></td><td className="small">{r.admin ? 'admin' : r.role}</td><td><span className={`badge ${r.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td><td className="small muted">{formatDate(r.created_at)}</td>
      <td>{!r.admin && <AdminAction body={{ op: 'user_status', id: r.id, status: r.status === 'active' ? 'suspended' : 'active' }} label={r.status === 'active' ? 'Suspend' : 'Reactivate'} />}</td></tr>))}</tbody></table></div>;
}
