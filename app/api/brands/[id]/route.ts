import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { brandInput, checkLogo } from '@/lib/server/brands';

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req); const u = await requireSeller(); const { id } = await ctx.params;
  const b = brandInput.parse(await req.json());
  await checkLogo(u.sellerId, b.logoUrl);
  const [row] = await sql`update brands set name = ${b.name}, tagline = ${b.tagline}, description = ${b.description}, website = ${b.website || null}, logo_url = ${b.logoUrl}, accent = ${b.accent}, instagram = ${b.instagram || null}
    where id = ${id} and seller_id = ${u.sellerId} returning *`;
  if (!row) throw new HttpError(404, 'Brand not found');
  return json({ brand: row });
});
