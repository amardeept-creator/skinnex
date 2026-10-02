import 'server-only';
import { sql } from './db';
import { getEntitlement } from './entitlements';
import type { AssetOpt } from '@/components/dash/SkinnerWizard';
export async function wizardContext(sellerId: string) {
  let brandRows = await sql`select id, name, slug, accent, logo_url from brands where seller_id = ${sellerId} order by created_at`;
  if (!brandRows.length) {
    brandRows = await sql`select id, name, slug, accent, logo_url from brands order by created_at limit 1`;
  }
  if (!brandRows.length) {
    brandRows = [{ id: 'b0000000-0000-0000-0000-000000000001', name: 'My Brand', slug: 'my-brand', accent: '#6E4CF5', logo_url: null }] as never;
  }
  const [categories, assetRows, e] = await Promise.all([
    sql`select slug, name, default_profile from categories where active order by sort`,
    sql`select id, url, original_filename, template_name, bytes, meta, is_template from ar_assets where kind = 'model' and status = 'ready' and (seller_id = ${sellerId} or is_template) order by is_template, created_at desc`,
    getEntitlement(sellerId),
  ]);
  const assets: AssetOpt[] = assetRows.map(a => ({ id: a.id, url: a.url, name: a.is_template ? a.template_name : a.original_filename, bytes: a.bytes, triangles: a.meta?.triangles, materials: a.meta?.materials, template: a.is_template, profile: a.meta?.profile ?? null, warnings: a.meta?.warnings }));
  return { brands: brandRows as never, categories: categories as never, assets, canEmbed: !!e.limits?.embed, branding: !e.limits?.remove_branding, e };
}
