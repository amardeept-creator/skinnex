import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { verifyPassword } from '@/lib/server/password';
import { createSession } from '@/lib/server/auth';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const b = schema.parse(await req.json());
  if (!rateLimit('login:' + clientIp(req), 20, 900_000).ok || !rateLimit('login-e:' + b.email, 8, 900_000).ok) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.');
  const [u] = await sql`select u.id, u.password_hash, u.status, (a.user_id is not null) as is_admin, s.id as seller_id, (select count(*)::int from brands where seller_id = s.id) as brands
    from users u left join admin_users a on a.user_id = u.id left join sellers s on s.user_id = u.id where u.email = ${b.email}`;
  const ok = u ? await verifyPassword(b.password, u.password_hash) : (await verifyPassword(b.password, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(88)), false);
  if (!u || !ok) throw new HttpError(401, 'Email or password is incorrect.');
  if (u.status !== 'active') throw new HttpError(403, 'This account is suspended.');
  await createSession(u.id, req.headers.get('user-agent'));
  return json({ ok: true, next: u.seller_id ? (u.brands ? '/dashboard' : '/onboarding') : u.is_admin ? '/admin' : '/' });
});
