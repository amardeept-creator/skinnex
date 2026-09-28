import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { slugify } from '@/lib/server/ids';
import { brandInput, checkLogo } from '@/lib/server/brands';

export const GET = handle(async () => { const u = await requireSeller(); return json({ items: await sql`select * from brands where seller_id = ${u.sellerId} order by created_at` }); });

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req); const u = await requireSeller();
  const b = brandInput.parse(await req.json());
  await checkLogo(u.sellerId, b.logoUrl);
  const [{ n }] = await sql`select count(*)::int as n from brands where seller_id = ${u.sellerId}`;
  if (n >= 10) throw new HttpError(400, 'You can have up to 10 brands.');
  const base = slugify(b.name, 40); let slug = base; let i = 2;
  const reserved = ['admin', 'api', 'dashboard', 'skinify', 'explore', 'brands', 'embed', 'login', 'signup'];
  while (reserved.includes(slug) || (await sql`select 1 from brands where slug = ${slug}`).length) slug = `${base}-${i++}`;
  const [row] = await sql`insert into brands (seller_id, slug, name, tagline, description, website, logo_url, accent, instagram)
    values (${u.sellerId}, ${slug}, ${b.name}, ${b.tagline}, ${b.description}, ${b.website || null}, ${b.logoUrl}, ${b.accent}, ${b.instagram || null}) returning *`;
  return json({ brand: row }, 201);
});
