import { redirect, notFound } from 'next/navigation';
import { sql } from '@/lib/server/db';
/** Readable alias: /try/<brand>/<product> → canonical short link /s/<slug>. */
export default async function Try({ params }: { params: Promise<{ brand: string; product: string }> }) {
  const { brand, product } = await params;
  const [r] = await sql`select l.slug from public_links l join skinners s on s.id = l.skinner_id join products p on p.id = s.product_id join brands b on b.id = s.brand_id
    where b.slug = ${brand} and p.slug = ${product} order by (s.status = 'published') desc, s.updated_at desc limit 1`;
  if (!r) notFound();
  redirect(`/s/${r.slug}?src=link`);
}
