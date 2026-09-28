import 'server-only';
import { sql } from './db';
import { sha256, token } from './ids';
import { HttpError } from './http';
import { getEntitlement } from './entitlements';
import { rateLimit } from './ratelimit';
export async function createApiKey(sellerId: string, name: string) {
  const raw = `skn_live_${token(24)}`;
  await sql`insert into api_keys (seller_id, name, prefix, key_hash) values (${sellerId}, ${name}, ${raw.slice(0, 13)}, ${sha256(raw)})`;
  return raw; // shown once
}
export async function authApiKey(req: Request) {
  const h = req.headers.get('authorization') || ''; const raw = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!raw.startsWith('skn_live_')) throw new HttpError(401, 'Missing API key');
  const [k] = await sql`select id, seller_id from api_keys where key_hash = ${sha256(raw)} and revoked_at is null`;
  if (!k) throw new HttpError(401, 'Invalid API key');
  if (!rateLimit('api:' + k.id, 120, 60_000).ok) throw new HttpError(429, 'Rate limit exceeded');
  const e = await getEntitlement(k.seller_id);
  if (!e.active || !e.limits?.api_access) throw new HttpError(403, 'Your plan does not include API access');
  await sql`update api_keys set last_used_at = now() where id = ${k.id}`;
  return k.seller_id as string;
}
