import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { assignPlan } from '@/lib/server/entitlements';

const schema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('seller_status'), id: z.string().uuid(), status: z.enum(['active', 'suspended']) }),
  z.object({ op: z.literal('assign_plan'), id: z.string().uuid(), planId: z.string(), days: z.number().int().min(1).max(3650).nullable() }),
  z.object({ op: z.literal('expire_sub'), id: z.string().uuid() }),
  z.object({ op: z.literal('brand_status'), id: z.string().uuid(), status: z.enum(['active', 'disabled']) }),
  z.object({ op: z.literal('brand_feature'), id: z.string().uuid(), featured: z.boolean() }),
  z.object({ op: z.literal('product_status'), id: z.string().uuid(), status: z.enum(['active', 'disabled']) }),
  z.object({ op: z.literal('product_feature'), id: z.string().uuid(), featured: z.boolean() }),
  z.object({ op: z.literal('skinner_disable'), id: z.string().uuid(), disabled: z.boolean(), reason: z.string().max(200).default('') }),
  z.object({ op: z.literal('report_status'), id: z.number().int(), status: z.enum(['open', 'resolved', 'dismissed']) }),
  z.object({ op: z.literal('plan_update'), id: z.string(), price_cents: z.number().int().min(0).nullable(), stripe_price_id: z.string().max(100).nullable(), is_public: z.boolean(), active: z.boolean(), limits: z.object({
    max_active_skinners: z.number().int().nullable(), max_skinners: z.number().int().nullable(), link_validity_days: z.number().int().nullable(), monthly_ar_sessions: z.number().int().nullable(),
    storage_mb: z.number().int(), max_upload_mb: z.number().int(), analytics: z.enum(['basic', 'advanced']), remove_branding: z.boolean(), embed: z.boolean(), api_access: z.boolean(), qr: z.boolean() }) }),
  z.object({ op: z.literal('category_upsert'), slug: z.string().regex(/^[a-z0-9-]{2,30}$/), name: z.string().min(2).max(40), description: z.string().max(200).default(''), active: z.boolean(), default_profile: z.string().nullable() }),
  z.object({ op: z.literal('user_status'), id: z.string().uuid(), status: z.enum(['active', 'suspended']) }),
]);

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req); const admin = await requireAdmin();
  const b = schema.parse(await req.json());
  switch (b.op) {
    case 'seller_status': await sql`update sellers set status = ${b.status} where id = ${b.id}`; break;
    case 'assign_plan': { const [p] = await sql`select id from subscription_plans where id = ${b.planId}`; if (!p) throw new HttpError(404, 'Plan not found'); await assignPlan(b.id, b.planId, 'manual', b.days, 'active'); break; }
    case 'expire_sub': await sql`update subscriptions set status = 'expired', expires_at = now(), updated_at = now() where seller_id = ${b.id}`; break;
    case 'brand_status': await sql`update brands set status = ${b.status} where id = ${b.id}`; break;
    case 'brand_feature': await sql`update brands set is_featured = ${b.featured} where id = ${b.id}`; break;
    case 'product_status': await sql`update products set status = ${b.status} where id = ${b.id}`; break;
    case 'product_feature': await sql`update products set is_featured = ${b.featured} where id = ${b.id}`; break;
    case 'skinner_disable': await sql`update skinners set admin_disabled = ${b.disabled}, disabled_reason = ${b.disabled ? b.reason || 'Policy review' : null} where id = ${b.id}`; break;
    case 'report_status': await sql`update reports set status = ${b.status}, resolved_by = ${admin.id} where id = ${b.id}`; break;
    case 'plan_update': await sql`update subscription_plans set price_cents = ${b.price_cents}, stripe_price_id = ${b.stripe_price_id}, is_public = ${b.is_public}, active = ${b.active}, limits = ${sql.json(b.limits as never)} where id = ${b.id}`; break;
    case 'category_upsert': await sql`insert into categories (slug, name, description, active, default_profile) values (${b.slug}, ${b.name}, ${b.description}, ${b.active}, ${b.default_profile})
      on conflict (slug) do update set name = excluded.name, description = excluded.description, active = excluded.active, default_profile = excluded.default_profile`; break;
    case 'user_status': if (b.id === admin.id) throw new HttpError(400, 'You cannot suspend yourself'); await sql`update users set status = ${b.status} where id = ${b.id}`; if (b.status === 'suspended') await sql`delete from sessions where user_id = ${b.id}`; break;
  }
  return json({ ok: true });
});
