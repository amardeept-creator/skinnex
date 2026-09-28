import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from './db';
import { token, sha256 } from './ids';
import { HttpError } from './http';

export const SESSION_COOKIE = 'skn_session';
const SESSION_DAYS = 30;

export interface SessionUser { id: string; email: string; name: string; role: string; sellerId: string | null; isAdmin: boolean; sellerStatus: string | null }

export async function createSession(userId: string, ua?: string | null) {
  const raw = token(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await sql`insert into sessions (id, user_id, expires_at, user_agent) values (${sha256(raw)}, ${userId}, ${expires}, ${ua?.slice(0, 200) ?? null})`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires });
}

export async function destroySession() {
  const jar = await cookies(); const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) await sql`delete from sessions where id = ${sha256(raw)}`;
  jar.delete(SESSION_COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const jar = await cookies(); const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const rows = await sql`
    select u.id, u.email, u.name, u.role, u.status, s.id as seller_id, s.status as seller_status, (a.user_id is not null) as is_admin
    from sessions x join users u on u.id = x.user_id
    left join sellers s on s.user_id = u.id
    left join admin_users a on a.user_id = u.id
    where x.id = ${sha256(raw)} and x.expires_at > now()`;
  const r = rows[0]; if (!r || r.status !== 'active') return null;
  return { id: r.id, email: r.email, name: r.name, role: r.role, sellerId: r.seller_id, isAdmin: r.is_admin, sellerStatus: r.seller_status };
}

export async function requireUser() { const u = await getUser(); if (!u) throw new HttpError(401, 'Please sign in'); return u; }
export async function requireSeller() {
  const u = await requireUser();
  if (!u.sellerId) throw new HttpError(403, 'Seller account required');
  if (u.sellerStatus === 'suspended') throw new HttpError(403, 'This seller account is suspended');
  return u as SessionUser & { sellerId: string };
}
export async function requireAdmin() { const u = await requireUser(); if (!u.isAdmin) throw new HttpError(403, 'Admin only'); return u; }

/** For server components: redirect instead of throwing. */
export async function pageSeller() {
  const u = await getUser(); if (!u) redirect('/login?next=/dashboard');
  if (!u.sellerId) redirect('/signup');
  return u as SessionUser & { sellerId: string };
}
export async function pageAdmin() { const u = await getUser(); if (!u) redirect('/login?next=/admin'); if (!u.isAdmin) redirect('/'); return u; }
