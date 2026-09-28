import { z } from 'zod';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { getOwnedSkinner, updateSkinner, deleteSkinner, skinnerAction, skinnerInput } from '@/lib/server/skinners';

type Ctx = { params: Promise<{ id: string }> };
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const u = await requireSeller(); const s = await getOwnedSkinner(u.sellerId, (await ctx.params).id);
  if (!s) throw new HttpError(404, 'Skinner not found'); return json({ skinner: s });
});
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req); const u = await requireSeller(); const id = (await ctx.params).id;
  await updateSkinner(u.sellerId, id, skinnerInput.parse(await req.json())); return json({ id });
});
const actionSchema = z.object({ action: z.enum(['publish', 'unpublish', 'duplicate', 'renew']) });
export const POST = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req); const u = await requireSeller();
  return json(await skinnerAction(u.sellerId, (await ctx.params).id, actionSchema.parse(await req.json()).action));
});
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req); const u = await requireSeller(); await deleteSkinner(u.sellerId, (await ctx.params).id); return json({ ok: true });
});
