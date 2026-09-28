import Link from 'next/link';
import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { sellerSummary } from '@/lib/server/analytics';
import { getEntitlement } from '@/lib/server/entitlements';
import { Stat } from '@/components/dash/Stat';
import { MiniChart } from '@/components/dash/MiniChart';
import { num } from '@/lib/format';

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string; skinner?: string }> }) {
  const u = await pageSeller(); const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const e = await getEntitlement(u.sellerId);
  const advanced = e.limits?.analytics === 'advanced';
  const skinners = await sql`select id, name from skinners where seller_id = ${u.sellerId} order by name`;
  const sk = sp.skinner && skinners.some(s => s.id === sp.skinner) ? sp.skinner : null;
  const s = await sellerSummary(u.sellerId, days, sk);
  const t = s.totals;
  const pct = (a: number, b: number) => b ? `${Math.round(a / b * 100)}%` : '—';
  const q = (o: Record<string, string | number | null>) => '?' + new URLSearchParams(Object.entries({ days, skinner: sk, ...o }).filter(([, v]) => v != null && v !== '') as [string, string][]).toString();
  return (
    <>
      <div className="dash-head"><div><h1>Analytics</h1><p className="small muted" style={{ marginTop: 6 }}>Real events only. Seller previews and bots without JavaScript are not counted. No sample data.</p></div><span className="spacer" />
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[7, 30, 90].map(d => <Link key={d} href={q({ days: d })} className={`chip${d === days ? ' active' : ''}`}>{d} days</Link>)}
        <span className="spacer" />
        {sk && <Link href={q({ skinner: null })} className="chip">× {skinners.find(k => k.id === sk)?.name}</Link>}
      </div>
      <div className="stats">
        <Stat k="Product views" v={t.product_views} /><Stat k="Skinner opens" v={t.link_clicks} sub="Link, QR, embed & discovery" /><Stat k="Camera starts" v={t.ar_sessions} sub={`${pct(t.ar_sessions, t.link_clicks)} of opens`} />
        <Stat k="Try-ons" v={t.tryons} sub={`${pct(t.tryons, t.ar_sessions)} of camera starts`} /><Stat k="Captures" v={t.captures} /><Stat k="Shares" v={t.shares} /><Stat k="Buy clicks" v={t.buy_clicks} sub={`${pct(t.buy_clicks, t.tryons)} of try-ons`} />
        <Stat k="Avg. session" v={t.avg_session_ms ? `${(t.avg_session_ms / 1000).toFixed(0)}s` : '—'} />
      </div>
      <div className="card card-pad" style={{ marginTop: 16 }}><b>Daily</b><div style={{ marginTop: 12 }}><MiniChart data={s.daily as never} keys={[{ key: 'views', label: 'Product views', color: '#C9A15B' }, { key: 'launches', label: 'Skinner opens', color: '#6E4CF5' }, { key: 'tryons', label: 'Try-ons', color: '#E0567E' }]} /></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, marginTop: 16 }}>
        {advanced ? (<>
          <Breakdown title="Traffic source" rows={s.sources.map(r => [String(r.source), Number(r.n)])} />
          <Breakdown title="Device" rows={s.devices.map(r => [String(r.device), Number(r.n)])} />
        </>) : <div className="card card-pad"><b>Sources &amp; devices</b><p className="small muted" style={{ marginTop: 8 }}>Traffic source (link, QR, embed, discovery, share) and device breakdowns are included in Pro and above.</p><Link href="/dashboard/subscription" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>See plans</Link></div>}
        <div className="card card-pad" style={{ gridColumn: '1 / -1' }}><b>By Skinner</b>
          <div className="table-wrap" style={{ marginTop: 10 }}><table className="table"><thead><tr><th>Skinner</th><th>Views</th><th>Opens</th><th>Try-ons</th><th>Shares</th><th>Buy clicks</th></tr></thead>
            <tbody>{s.top.length ? s.top.map(k => <tr key={k.id}><td><Link href={q({ skinner: k.id })} style={{ fontWeight: 700 }}>{k.name}</Link></td><td>{num(k.views)}</td><td>{num(k.launches)}</td><td>{num(k.tryons)}</td><td>{num(k.shares)}</td><td>{num(k.buy_clicks)}</td></tr>) : <tr><td colSpan={6} className="faint">No Skinners yet</td></tr>}</tbody></table></div>
        </div>
      </div>
      <details className="card card-pad" style={{ marginTop: 16 }}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>How metrics are defined</summary>
        <ul className="small muted" style={{ marginTop: 10, lineHeight: 1.8 }}>
          <li><b>Product view</b> — product page opened (once per visitor session per 30 min).</li>
          <li><b>Skinner open</b> — the public Skinner link / QR / embed was opened.</li>
          <li><b>Camera start</b> — camera permission granted and AR started.</li>
          <li><b>Try-on</b> — the product was anchored on the body part for at least 2 seconds.</li>
          <li><b>Share / capture / buy click</b> — the customer tapped those buttons. Purchases happen on your store and are not tracked by SKINIFY.</li>
        </ul></details>
    </>
  );
}
function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  const total = rows.reduce((a, [, n]) => a + n, 0);
  return <div className="card card-pad"><b>{title}</b>{rows.length === 0 ? <p className="small faint" style={{ marginTop: 10 }}>No data yet</p> : <div className="stack" style={{ gap: 10, marginTop: 12 }}>{rows.map(([k, n]) => <div key={k}><div className="row small"><span style={{ textTransform: 'capitalize' }}>{k}</span><span className="spacer" /><span className="tabular">{num(n)}</span></div><div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${(n / total) * 100}%` }} /></div></div>)}</div>}</div>;
}
