import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { hashPassword } from '@/lib/server/password';
import { createSession } from '@/lib/server/auth';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { assignPlan } from '@/lib/server/entitlements';

const schema = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(8, 'Use at least 8 characters').max(200) });
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  if (!rateLimit('signup:' + clientIp(req), 8, 3600_000).ok) throw new HttpError(429, 'Too many sign-ups from this network. Try again later.');
  const b = schema.parse(await req.json());
  const [exists] = await sql`select 1 from users where email = ${b.email}`;
  if (exists) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
  const hash = await hashPassword(b.password);
  const [u] = await sql`insert into users (email, password_hash, name, role) values (${b.email}, ${hash}, ${b.name}, 'seller') returning id`;
  const [s] = await sql`insert into sellers (user_id) values (${u.id}) returning id`;
  const [plan] = await sql`select id, trial_days from subscription_plans where is_default and active limit 1`;
  if (plan) await assignPlan(s.id, plan.id, 'none', plan.trial_days || 14, 'trialing');
  await createSession(u.id, req.headers.get('user-agent'));
  return json({ ok: true, next: '/onboarding' });
});
