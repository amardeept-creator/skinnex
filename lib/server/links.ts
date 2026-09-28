import 'server-only';
import { sql } from './db';
import { isSubActive, PlanLimits } from './entitlements';
import type { ARConfig } from '@/lib/ar/config';

export type LinkState = 'ok' | 'invalid' | 'product_removed' | 'disabled' | 'unpublished' | 'subscription_expired' | 'link_expired' | 'usage_limit';

export interface PublicSkinner {
  state: LinkState;
  slug: string;
  skinnerId: string; sellerId: string; brandId: string; productId: string;
  name: string; profile: string; config: ARConfig; modelUrl: string | null;
  product: { name: string; slug: string; description: string; price_cents: number | null; currency: string; purchase_url: string | null; images: { url: string; alt?: string }[]; category_slug: string };
  brand: { name: string; slug: string; logo_url: string | null; accent: string; website: string | null };
  variants: { id: string; name: string; color_hex: string | null; ar_overrides: Record<string, unknown> }[];
  branding: boolean; embed: boolean; expiresAt: string | null; isDemo: boolean;
}

export async function resolvePublicSkinner(slug: string): Promise<PublicSkinner | { state: 'invalid' }> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return { state: 'invalid' };
  const [r] = await sql`
    select l.slug, l.status as link_status, l.expires_at as link_expires, s.id as skinner_id, s.name, s.status, s.admin_disabled, s.tracking_profile, s.seller_id, s.brand_id, s.product_id,
      c.config, a.url as model_url, p.name as p_name, p.slug as p_slug, p.description, p.price_cents, p.currency, p.purchase_url, p.images, p.category_slug, p.status as p_status,
      b.name as b_name, b.slug as b_slug, b.logo_url, b.accent, b.website, b.status as b_status, se.status as se_status, se.is_demo,
      sub.status as sub_status, sub.expires_at as sub_expires, pl.limits
    from public_links l
    join skinners s on s.id = l.skinner_id
    join products p on p.id = s.product_id
    join brands b on b.id = s.brand_id
    join sellers se on se.id = s.seller_id
    left join ar_configurations c on c.skinner_id = s.id
    left join ar_assets a on a.id = s.asset_id
    left join subscriptions sub on sub.seller_id = s.seller_id
    left join subscription_plans pl on pl.id = sub.plan_id
    where l.slug = ${slug}`;
  if (!r) return { state: 'invalid' };
  const limits = (r.limits || {}) as PlanLimits;
  let state: LinkState = 'ok';
  if (r.p_status !== 'active') state = 'product_removed';
  else if (r.admin_disabled || r.b_status !== 'active' || r.se_status !== 'active') state = 'disabled';
  else if (r.status !== 'published' || r.link_status !== 'active') state = 'unpublished';
  else if (!isSubActive({ status: r.sub_status, expires_at: r.sub_expires })) state = 'subscription_expired';
  else if (r.link_expires && new Date(r.link_expires).getTime() <= Date.now()) state = 'link_expired';
  else if (limits.monthly_ar_sessions != null) {
    const [u] = await sql`select count(*)::int as n from analytics_events where seller_id = ${r.seller_id} and event = 'ar_session_start' and created_at >= date_trunc('month', now())`;
    if (u.n >= limits.monthly_ar_sessions) state = 'usage_limit';
  }
  const variants = state === 'ok' ? await sql`select id, name, color_hex, ar_overrides from product_variants where product_id = ${r.product_id} order by sort` : [];
  return {
    state, slug: r.slug, skinnerId: r.skinner_id, sellerId: r.seller_id, brandId: r.brand_id, productId: r.product_id,
    name: r.name, profile: r.tracking_profile, config: r.config, modelUrl: r.model_url,
    product: { name: r.p_name, slug: r.p_slug, description: r.description, price_cents: r.price_cents, currency: r.currency, purchase_url: r.purchase_url, images: r.images || [], category_slug: r.category_slug },
    brand: { name: r.b_name, slug: r.b_slug, logo_url: r.logo_url, accent: r.accent, website: r.website },
    variants: variants as unknown as PublicSkinner['variants'],
    branding: !limits.remove_branding, embed: !!limits.embed, expiresAt: r.link_expires ? new Date(r.link_expires).toISOString() : null, isDemo: r.is_demo,
  };
}
