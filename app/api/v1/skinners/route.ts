import { sql } from '@/lib/server/db';
import { json, handle } from '@/lib/server/http';
import { authApiKey } from '@/lib/server/apikeys';
export const GET = handle(async (req: Request) => {
  const sellerId = await authApiKey(req);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const rows = await sql`select s.id, s.name, s.status, s.tracking_profile, p.name as product_name, p.price_cents, p.currency, b.slug as brand, l.slug, l.expires_at
    from skinners s join products p on p.id = s.product_id join brands b on b.id = s.brand_id left join public_links l on l.skinner_id = s.id where s.seller_id = ${sellerId} order by s.created_at desc`;
  return json({ data: rows.map(r => ({ ...r, url: r.slug ? `${origin}/s/${r.slug}` : null, embed_url: r.slug ? `${origin}/embed/${r.slug}` : null, qr_png: r.slug ? `${origin}/api/qr/${r.slug}?format=png` : null })) });
});
