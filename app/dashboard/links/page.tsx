import Link from 'next/link';
import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { getEntitlement } from '@/lib/server/entitlements';
import { LinkPanel } from '@/components/dash/LinkPanel';
import { StatusBadge, liveState } from '@/components/dash/StatusBadge';
import { SkinnerActions } from '@/components/dash/SkinnerActions';

export default async function Links({ searchParams }: { searchParams: Promise<{ skinner?: string }> }) {
  const u = await pageSeller(); const sp = await searchParams;
  const e = await getEntitlement(u.sellerId);
  const rows = await sql`select s.id, s.name, s.status, s.admin_disabled, l.slug, l.expires_at as link_expires, l.created_at as link_created, p.images->0->>'url' as image
    from skinners s join public_links l on l.skinner_id = s.id join products p on p.id = s.product_id where s.seller_id = ${u.sellerId} order by s.updated_at desc`;
  const sel = rows.find(r => r.id === sp.skinner) || rows[0];
  return (
    <>
      <div className="dash-head"><div><h1>Links &amp; QR</h1><p className="small muted" style={{ marginTop: 6 }}>Create once. Share anywhere.</p></div></div>
      {rows.length === 0 ? <div className="card card-pad" style={{ textAlign: 'center', padding: 48 }}><h2 style={{ fontSize: 24 }}>No links yet</h2><p className="muted" style={{ marginTop: 6 }}>A public link and QR code are created when you publish a Skinner.</p><Link href="/dashboard/skinners" className="btn btn-primary" style={{ marginTop: 14 }}>My Skinners</Link></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ padding: 8 }}>{rows.map(r => { const st = liveState(r as never, e.active); return (
            <Link key={r.id} href={`?skinner=${r.id}`} className="row" style={{ padding: 10, borderRadius: 12, background: sel?.id === r.id ? 'var(--lilac)' : undefined }}>
              {r.image && <img className="thumb" src={r.image} alt="" />}<div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700 }}>{r.name}</div><code className="tiny faint">/s/{r.slug}</code></div><StatusBadge state={st} />
            </Link>); })}</div>
          {sel && <div className="card card-pad stack" style={{ gap: 14 }}>
            <div className="row"><h2 style={{ fontSize: 22 }}>{sel.name}</h2><span className="spacer" /><SkinnerActions id={sel.id} slug={sel.slug} state={liveState(sel as never, e.active)} compact={false} /></div>
            {liveState(sel as never, e.active) !== 'live' && <div className="alert alert-warn small">This link currently shows a “not available” page to customers ({liveState(sel as never, e.active).replace('_', ' ')}).</div>}
            <LinkPanel slug={sel.slug} name={sel.name} canEmbed={!!e.limits?.embed} expires={sel.link_expires ? new Date(sel.link_expires).toISOString() : null} />
          </div>}
        </div>
      )}
    </>
  );
}
