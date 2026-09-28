import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { getEntitlement } from '@/lib/server/entitlements';
import { AccountForm, ApiKeys } from '@/components/dash/AccountForms';
import { formatDate } from '@/lib/format';
export default async function Account() {
  const u = await pageSeller();
  const [e, keys] = await Promise.all([getEntitlement(u.sellerId), sql`select id, name, prefix, created_at, last_used_at from api_keys where seller_id = ${u.sellerId} and revoked_at is null order by created_at desc`]);
  return (
    <>
      <div className="dash-head"><div><h1>Account</h1></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 16, alignItems: 'start' }}>
        <div className="card card-pad"><AccountForm name={u.name} email={u.email} /></div>
        <div className="card card-pad"><ApiKeys enabled={!!e.limits?.api_access} keys={keys.map(k => ({ id: k.id, name: k.name, prefix: k.prefix, created: formatDate(k.created_at), used: k.last_used_at ? formatDate(k.last_used_at) : 'never' }))} /></div>
      </div>
    </>
  );
}
