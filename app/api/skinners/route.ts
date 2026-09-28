import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { createSkinner, skinnerInput } from '@/lib/server/skinners';

export const GET = handle(async () => {
  const u = await requireSeller();
  const rows = await sql`select s.id, s.name, s.status, s.tracking_profile, s.admin_disabled, s.created_at, s.updated_at, s.published_at, p.images->0->>'url' as image, l.slug as link_slug, l.expires_at, l.status as link_status
    from skinners s join products p on p.id = s.product_id left join public_links l on l.skinner_id = s.id where s.seller_id = ${u.sellerId} order by s.updated_at desc`;
  return json({ items: rows });
});
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req); const u = await requireSeller();
  const r = await createSkinner(u.sellerId, skinnerInput.parse(await req.json()));
  return json(r, 201);
});
