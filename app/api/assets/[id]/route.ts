import { json, handle, assertSameOrigin } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { deleteAsset } from '@/lib/server/assets';
export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req); const u = await requireSeller(); await deleteAsset(u.sellerId, (await ctx.params).id); return json({ ok: true });
});
