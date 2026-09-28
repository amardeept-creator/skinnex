import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { hashPassword, verifyPassword } from '@/lib/server/password';
import { cookies } from 'next/headers';
import { sha256 } from '@/lib/server/ids';
const schema = z.object({ name: z.string().trim().min(1).max(80), currentPassword: z.string().optional(), newPassword: z.string().min(8).max(200).optional().or(z.literal('')) });
export const PATCH = handle(async (req: Request) => {
  assertSameOrigin(req); const u = await requireUser(); const b = schema.parse(await req.json());
  await sql`update users set name = ${b.name} where id = ${u.id}`;
  if (b.newPassword) {
    const [r] = await sql`select password_hash from users where id = ${u.id}`;
    if (!b.currentPassword || !(await verifyPassword(b.currentPassword, r.password_hash))) throw new HttpError(400, 'Current password is incorrect');
    await sql`update users set password_hash = ${await hashPassword(b.newPassword)} where id = ${u.id}`;
    const cur = (await cookies()).get('skn_session')?.value || '';
    await sql`delete from sessions where user_id = ${u.id} and id <> ${sha256(cur)}`; // sign out other devices
  }
  return json({ ok: true });
});
