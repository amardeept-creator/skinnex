import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req); const u = await requireSeller();
  await sql`update api_keys set revoked_at = now() where id = ${(await ctx.params).id} and seller_id = ${u.sellerId}`; return json({ ok: true });
});
