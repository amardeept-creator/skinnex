import 'server-only';
import { z } from 'zod';
import { sql } from './db';
import { HttpError } from './http';
import { shortId, slugify } from './ids';
import { arConfigSchema, variantOverridesSchema, PROFILE_BY_KEY, buildDefaultConfig } from '@/lib/ar/config';
import { getEntitlement, canCreateSkinner, canPublish, linkExpiry, isSubActive } from './entitlements';

const url = z.string().trim().max(500);
const httpsUrl = z.string().trim().max(500).refine(v => /^https?:\/\/[^\s]+$/i.test(v), 'Must be a full http(s) URL');

export const productInput = z.object({
  name: z.string().trim().min(2, 'Product name is required').max(120),
  category: z.string().min(1),
  description: z.string().trim().max(4000).default(''),
  price: z.number().min(0).max(10_000_000).nullable().default(null),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
  purchaseUrl: httpsUrl.nullable().or(z.literal('').transform(() => null)).default(null),
  tags: z.array(z.string().trim().toLowerCase().max(30)).max(20).default([]),
  colors: z.array(z.string().trim().toLowerCase().max(20)).max(12).default([]),
  images: z.array(url).max(8).default([]),
  videoUrl: url.nullable().default(null),
});

const uuidSchema = z.string().refine(s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s), 'Invalid UUID');

export const skinnerInput = z.object({
  brandId: uuidSchema,
  product: productInput,
  variants: z.array(z.object({ name: z.string().trim().min(1).max(40), color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null), ar_overrides: variantOverridesSchema.default({}) })).max(12).default([]),
  profile: z.string().refine(k => !!PROFILE_BY_KEY[k], 'Unknown Skinner type'),
  assetId: uuidSchema.nullable().default(null),
  config: z.unknown().optional(),
});
export type SkinnerInput = z.infer<typeof skinnerInput>;

async function assertOwnedUrls(sellerId: string, urls: string[]) {
  const foreign = urls.filter(u => !u.startsWith('/seed/'));
  if (!foreign.length) return;
  const rows = await sql`select url from ar_assets where url = any(${foreign}) and (seller_id = ${sellerId} or is_template) and status = 'ready'`;
  const ok = new Set(rows.map(r => r.url));
  if (foreign.some(u => !ok.has(u))) throw new HttpError(400, 'Images must be uploaded through SKINIFY.');
}

async function validate(sellerId: string, b: SkinnerInput) {
  const [brand] = await sql`select id from brands where id = ${b.brandId} limit 1`;
  if (!brand) throw new HttpError(404, 'Brand not found');
  const [cat] = await sql`select slug from categories where slug = ${b.product.category} and active`;
  if (!cat) throw new HttpError(400, 'Choose a category');
  await assertOwnedUrls(sellerId, [...b.product.images, ...(b.product.videoUrl ? [b.product.videoUrl] : [])]);
  const profile = PROFILE_BY_KEY[b.profile];
  let assetId: string | null = null;
  if (b.assetId) {
    const [a] = await sql`select id, kind from ar_assets where id = ${b.assetId} and (seller_id = ${sellerId} or is_template) and status = 'ready'`;
    if (!a) throw new HttpError(400, 'Asset not found');
    if (a.kind !== 'model') throw new HttpError(400, 'The AR asset must be a 3D model');
    assetId = a.id;
  }
  const cfgRaw = (b.config && typeof b.config === 'object') ? { ...(b.config as object), anchor: profile.anchor } : buildDefaultConfig(b.profile);
  const config = arConfigSchema.parse(cfgRaw);
  if (config.imagePlane?.url) await assertOwnedUrls(sellerId, [config.imagePlane.url]);
  return { profile, assetId, config };
}

function searchText(p: SkinnerInput['product'], brandName: string, catName: string, variants: { name: string }[]) {
  return [p.name, brandName, catName, p.category, p.description.slice(0, 300), ...p.tags, ...p.colors, ...variants.map(v => v.name)].join(' ').toLowerCase();
}

async function uniqueProductSlug(brandId: string, name: string, exceptId?: string) {
  const base = slugify(name, 60); let s = base; let i = 2;
  while ((await sql`select 1 from products where brand_id = ${brandId} and slug = ${s} and id is distinct from ${exceptId ?? null}::uuid`).length) s = `${base}-${i++}`;
  return s;
}

export async function createSkinner(sellerId: string, b: SkinnerInput) {
  const e = await getEntitlement(sellerId);
  const block = canCreateSkinner(e); if (block) throw new HttpError(402, block);
  const { profile, assetId, config } = await validate(sellerId, b);
  const [meta] = await sql`select b.name as brand_name, c.name as cat_name from brands b, categories c where b.id = ${b.brandId} and c.slug = ${b.product.category}`;
  const slug = await uniqueProductSlug(b.brandId, b.product.name);
  return sql.begin(async (tx) => {
    const [p] = await tx`insert into products (seller_id, brand_id, slug, name, category_slug, description, price_cents, currency, purchase_url, tags, colors, images, video_url, search_text)
      values (${sellerId}, ${b.brandId}, ${slug}, ${b.product.name}, ${b.product.category}, ${b.product.description}, ${b.product.price == null ? null : Math.round(b.product.price * 100)}, ${b.product.currency}, ${b.product.purchaseUrl}, ${b.product.tags}, ${b.product.colors},
        ${tx.json(b.product.images.map(u => ({ url: u, alt: b.product.name })) as never)}, ${b.product.videoUrl}, ${searchText(b.product, meta.brand_name, meta.cat_name, b.variants)}) returning id`;
    for (const [i, v] of b.variants.entries()) await tx`insert into product_variants (product_id, name, color_hex, ar_overrides, sort) values (${p.id}, ${v.name}, ${v.color_hex}, ${tx.json(v.ar_overrides as never)}, ${i})`;
    const [s] = await tx`insert into skinners (seller_id, brand_id, product_id, name, tracking_profile, asset_id, status) values (${sellerId}, ${b.brandId}, ${p.id}, ${b.product.name}, ${profile.key}, ${assetId}, 'draft') returning id`;
    await tx`insert into ar_configurations (skinner_id, anchor, config) values (${s.id}, ${config.anchor}, ${tx.json(config as never)})`;
    return { id: s.id as string, productId: p.id as string };
  });
}

export async function getOwnedSkinner(sellerId: string, id: string) {
  const [s] = await sql`
    select s.*, p.name as p_name, p.slug as p_slug, p.category_slug, p.description, p.price_cents, p.currency, p.purchase_url, p.tags, p.colors, p.images, p.video_url, p.status as product_status,
      b.name as brand_name, b.slug as brand_slug, b.accent as brand_accent, b.logo_url as brand_logo, c.config, a.url as model_url, a.meta as asset_meta, a.original_filename as asset_name, a.bytes as asset_bytes,
      l.slug as link_slug, l.status as link_status, l.expires_at as link_expires, l.created_at as link_created
    from skinners s join products p on p.id = s.product_id join brands b on b.id = s.brand_id
    left join ar_configurations c on c.skinner_id = s.id left join ar_assets a on a.id = s.asset_id left join public_links l on l.skinner_id = s.id
    where s.id = ${id} and s.seller_id = ${sellerId}`;
  if (!s) return null;
  const variants = await sql`select id, name, color_hex, ar_overrides from product_variants where product_id = ${s.product_id} order by sort`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...s, variants } as Record<string, any>;
}

export async function updateSkinner(sellerId: string, id: string, b: SkinnerInput) {
  const cur = await getOwnedSkinner(sellerId, id); if (!cur) throw new HttpError(404, 'Skinner not found');
  const { profile, assetId, config } = await validate(sellerId, { ...b, brandId: cur.brand_id });
  const [meta] = await sql`select b.name as brand_name, c.name as cat_name from brands b, categories c where b.id = ${cur.brand_id} and c.slug = ${b.product.category}`;
  await sql.begin(async (tx) => {
    await tx`update products set name = ${b.product.name}, category_slug = ${b.product.category}, description = ${b.product.description}, price_cents = ${b.product.price == null ? null : Math.round(b.product.price * 100)},
      currency = ${b.product.currency}, purchase_url = ${b.product.purchaseUrl}, tags = ${b.product.tags}, colors = ${b.product.colors}, images = ${tx.json(b.product.images.map(u => ({ url: u, alt: b.product.name })) as never)},
      video_url = ${b.product.videoUrl}, search_text = ${searchText(b.product, meta.brand_name, meta.cat_name, b.variants)}, updated_at = now() where id = ${cur.product_id}`;
    await tx`delete from product_variants where product_id = ${cur.product_id}`;
    for (const [i, v] of b.variants.entries()) await tx`insert into product_variants (product_id, name, color_hex, ar_overrides, sort) values (${cur.product_id}, ${v.name}, ${v.color_hex}, ${tx.json(v.ar_overrides as never)}, ${i})`;
    await tx`update skinners set name = ${b.product.name}, tracking_profile = ${profile.key}, asset_id = ${assetId}, updated_at = now() where id = ${id}`;
    await tx`insert into ar_configurations (skinner_id, anchor, config) values (${id}, ${config.anchor}, ${tx.json(config as never)})
      on conflict (skinner_id) do update set anchor = excluded.anchor, config = excluded.config, version = ar_configurations.version + 1, updated_at = now()`;
  });
}

export async function skinnerAction(sellerId: string, id: string, action: 'publish' | 'unpublish' | 'duplicate' | 'renew') {
  const s = await getOwnedSkinner(sellerId, id); if (!s) throw new HttpError(404, 'Skinner not found');
  const e = await getEntitlement(sellerId);
  if (action === 'publish') {
    if (s.admin_disabled) throw new HttpError(403, `This Skinner was disabled by SKINIFY moderation${s.disabled_reason ? `: ${s.disabled_reason}` : ''}.`);
    if (s.status !== 'published') { const block = canPublish(e); if (block) throw new HttpError(402, block); }
    const profile = PROFILE_BY_KEY[s.tracking_profile];
    if (profile.renderMode === 'model' && !s.asset_id) throw new HttpError(400, 'Attach a 3D model before publishing.');
    if (profile.renderMode === 'image_plane' && !s.config?.imagePlane?.url) throw new HttpError(400, 'Attach a transparent garment image before publishing.');
    if (!s.images?.length) throw new HttpError(400, 'Add at least one product image before publishing.');
    const exp = linkExpiry(e);
    await sql`update skinners set status = 'published', published_at = coalesce(published_at, now()), updated_at = now() where id = ${id}`;
    if (!s.link_slug) await sql`insert into public_links (skinner_id, slug, expires_at) values (${id}, ${`${slugify(s.p_name, 24)}-${shortId(6)}`}, ${exp})`;
    else await sql`update public_links set status = 'active', expires_at = case when expires_at is not null and expires_at < now() then ${exp} else coalesce(expires_at, ${exp}) end where skinner_id = ${id}`;
    await sql`update products set status = 'active' where id = ${s.product_id} and status = 'removed'`;
  } else if (action === 'unpublish') {
    await sql`update skinners set status = 'unpublished', updated_at = now() where id = ${id}`;
    await sql`update public_links set status = 'inactive' where skinner_id = ${id}`;
  } else if (action === 'renew') {
    if (!isSubActive(e.sub)) throw new HttpError(402, 'Renew your subscription first — then renew this link.');
    const exp = linkExpiry(e);
    await sql`update public_links set status = 'active', expires_at = ${exp}, renewed_at = now() where skinner_id = ${id}`;
  } else if (action === 'duplicate') {
    const block = canCreateSkinner(e); if (block) throw new HttpError(402, block);
    const r = await createSkinner(sellerId, {
      brandId: s.brand_id, profile: s.tracking_profile, assetId: s.asset_id, config: s.config,
      product: { name: `${s.p_name} (copy)`.slice(0, 120), category: s.category_slug, description: s.description, price: s.price_cents == null ? null : s.price_cents / 100, currency: s.currency, purchaseUrl: s.purchase_url, tags: s.tags, colors: s.colors, images: (s.images || []).map((i: { url: string }) => i.url), videoUrl: s.video_url },
      variants: s.variants.map((v: { name: string; color_hex: string | null; ar_overrides: object }) => ({ name: v.name, color_hex: v.color_hex, ar_overrides: v.ar_overrides })),
    });
    return { id: r.id };
  }
  return { id };
}

/** Deleting a Skinner removes the AR experience and its link; the product record is kept but hidden. */
export async function deleteSkinner(sellerId: string, id: string) {
  const s = await getOwnedSkinner(sellerId, id); if (!s) throw new HttpError(404, 'Skinner not found');
  await sql.begin(async (tx) => {
    await tx`delete from skinners where id = ${id}`;
    const [other] = await tx`select 1 from skinners where product_id = ${s.product_id} limit 1`;
    if (!other) await tx`update products set status = 'removed', updated_at = now() where id = ${s.product_id}`;
  });
}
