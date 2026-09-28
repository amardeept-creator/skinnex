import 'server-only';
import { sql } from './db';

export interface CardProduct {
  id: string; slug: string; name: string; price_cents: number | null; currency: string; category_slug: string; category_name: string;
  image: string | null; image2: string | null; brand_name: string; brand_slug: string; link_slug: string | null; tracking_profile: string | null;
  colors: string[]; created_at: string; score?: number;
}

const CARD_COLS = sql`p.id, p.slug, p.name, p.price_cents, p.currency, p.category_slug, c.name as category_name, p.images->0->>'url' as image, p.images->1->>'url' as image2,
  b.name as brand_name, b.slug as brand_slug, ls.link_slug, sk.tracking_profile, p.colors, p.created_at`;
const BASE_FROM = sql`from products p join brands b on b.id = p.brand_id join sellers se on se.id = p.seller_id join categories c on c.slug = p.category_slug
  left join lateral (select l.link_slug, l.skinner_id from live_skinners l where l.product_id = p.id limit 1) ls on true
  left join skinners sk on sk.id = ls.skinner_id`;
const VISIBLE = sql`p.status = 'active' and b.status = 'active' and se.status = 'active' and exists (select 1 from live_skinners lv where lv.product_id = p.id)`;
/** Public discovery only lists products whose Skinner is live (published, not disabled, link valid, subscription active). */

export interface Filters { q?: string; category?: string; brand?: string; color?: string; min?: number; max?: number; sort?: 'trending' | 'new' | 'price_asc' | 'price_desc'; ar?: boolean; limit?: number; offset?: number }

export async function listProducts(f: Filters = {}): Promise<{ items: CardProduct[]; total: number }> {
  const terms = (f.q || '').toLowerCase().split(/\s+/).map(t => t.replace(/[%_\\]/g, '')).filter(t => t.length > 0).slice(0, 6);
  const termSql = terms.length ? terms.map(t => sql`and p.search_text like ${'%' + t + '%'}`).reduce((a, b) => sql`${a} ${b}`) : sql``;
  const where = sql`where ${VISIBLE}
    ${termSql}
    ${f.category ? sql`and p.category_slug = ${f.category}` : sql``}
    ${f.brand ? sql`and b.slug = ${f.brand}` : sql``}
    ${f.color ? sql`and ${f.color.toLowerCase()} = any(p.colors)` : sql``}
    ${f.min != null ? sql`and p.price_cents >= ${Math.round(f.min * 100)}` : sql``}
    ${f.max != null ? sql`and p.price_cents <= ${Math.round(f.max * 100)}` : sql``}
    ${f.ar ? sql`and ls.link_slug is not null` : sql``}`;
  const order = f.sort === 'new' ? sql`order by p.created_at desc` : f.sort === 'price_asc' ? sql`order by p.price_cents asc nulls last` : f.sort === 'price_desc' ? sql`order by p.price_cents desc nulls last`
    : sql`order by coalesce(tr.score, 0) desc, p.is_featured desc, p.created_at desc`;
  const rows = await sql`
    select ${CARD_COLS}, coalesce(tr.score,0)::int as score, count(*) over() as total
    ${BASE_FROM}
    left join lateral (select count(*) filter (where e.event = 'tryon') * 3 + count(*) filter (where e.event = 'skinner_launch') + count(*) filter (where e.event = 'product_view') * 0.2 as score
      from analytics_events e where e.product_id = p.id and e.created_at > now() - interval '7 days') tr on true
    ${where} ${order} limit ${f.limit ?? 24} offset ${f.offset ?? 0}`;
  return { items: rows as unknown as CardProduct[], total: Number(rows[0]?.total ?? 0) };
}

export async function listCategories() {
  return sql`select c.*, (select count(*)::int from products p join brands b on b.id = p.brand_id join sellers se on se.id = p.seller_id where p.category_slug = c.slug and ${VISIBLE}) as product_count
    from categories c where c.active order by c.sort`;
}

export async function featuredBrands(limit = 8) {
  return sql`select b.slug, b.name, b.tagline, b.logo_url, b.accent, (select count(distinct l.product_id)::int from live_skinners l where l.brand_id = b.id) as product_count,
      (select p.images->0->>'url' from products p where p.brand_id = b.id and p.status='active' order by p.is_featured desc, p.created_at limit 1) as cover
    from brands b join sellers se on se.id = b.seller_id where b.status = 'active' and se.status = 'active' order by b.is_featured desc, b.created_at limit ${limit}`;
}

export async function getProductPage(brandSlug: string, productSlug: string) {
  const [p] = await sql`
    select p.*, c.name as category_name, b.name as brand_name, b.slug as brand_slug, b.logo_url as brand_logo, b.website as brand_website, b.accent as brand_accent, b.tagline as brand_tagline, se.is_demo,
      ls.link_slug, sk.tracking_profile, a.url as model_url, ac.config
    from products p join brands b on b.id = p.brand_id join sellers se on se.id = p.seller_id join categories c on c.slug = p.category_slug
    left join lateral (select l.link_slug, l.skinner_id from live_skinners l where l.product_id = p.id limit 1) ls on true
    left join skinners sk on sk.id = coalesce(ls.skinner_id, (select id from skinners where product_id = p.id and status = 'published' order by updated_at desc limit 1))
    left join ar_assets a on a.id = sk.asset_id
    left join ar_configurations ac on ac.skinner_id = sk.id
    where b.slug = ${brandSlug} and p.slug = ${productSlug} and b.status = 'active' and se.status = 'active'
      and exists (select 1 from skinners s3 where s3.product_id = p.id and s3.status = 'published' and not s3.admin_disabled)`;
  if (!p) return null;
  const variants = await sql`select id, name, color_hex, size, price_cents, ar_overrides from product_variants where product_id = ${p.id} order by sort`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...p, variants } as Record<string, any>;
}

export async function getBrandPage(slug: string) {
  const [b] = await sql`select b.*, se.is_demo from brands b join sellers se on se.id = b.seller_id where b.slug = ${slug} and b.status = 'active' and se.status = 'active'`;
  if (!b) return null;
  const { items } = await listProducts({ brand: slug, limit: 60, sort: 'trending' });
  return { brand: b, products: items };
}
