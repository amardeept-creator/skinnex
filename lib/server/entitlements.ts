import 'server-only';
import { sql } from './db';

export interface PlanLimits {
  max_active_skinners: number | null; max_skinners: number | null; link_validity_days: number | null;
  monthly_ar_sessions: number | null; storage_mb: number; max_upload_mb: number;
  analytics: 'basic' | 'advanced'; remove_branding: boolean; embed: boolean; api_access: boolean; qr: boolean;
}
export interface Plan { id: string; name: string; description: string; price_cents: number | null; currency: string; billing_interval: string; trial_days: number; limits: PlanLimits; stripe_price_id: string | null; is_public: boolean; sort: number }
export interface Subscription { id: string; plan_id: string; status: string; provider: string; started_at: Date; current_period_start: Date; current_period_end: Date | null; expires_at: Date | null; cancel_at_period_end: boolean }

export const ACTIVE_STATUSES = ['trialing', 'active', 'past_due'];
export function isSubActive(s: Pick<Subscription, 'status' | 'expires_at'> | null | undefined) {
  if (!s) return false;
  return ACTIVE_STATUSES.includes(s.status) && (!s.expires_at || new Date(s.expires_at).getTime() > Date.now());
}

export async function listPlans(includeHidden = false): Promise<Plan[]> {
  const rows = includeHidden ? await sql`select * from subscription_plans order by sort` : await sql`select * from subscription_plans where is_public and active order by sort`;
  return rows as unknown as Plan[];
}

export async function getEntitlement(sellerId: string) {
  const [row] = await sql`select sub.*, row_to_json(p.*) as plan from subscriptions sub join subscription_plans p on p.id = sub.plan_id where sub.seller_id = ${sellerId}`;
  const sub = (row || null) as (Subscription & { plan: Plan }) | null;
  // lazily flip expired subscriptions so every surface agrees
  if (sub && ACTIVE_STATUSES.includes(sub.status) && sub.expires_at && new Date(sub.expires_at).getTime() <= Date.now()) {
    await sql`update subscriptions set status = 'expired', updated_at = now() where id = ${sub.id}`; sub.status = 'expired';
  }
  const [u] = await sql`
    select
      (select count(*)::int from skinners where seller_id = ${sellerId}) as total_skinners,
      (select count(*)::int from skinners where seller_id = ${sellerId} and status = 'published') as active_skinners,
      (select coalesce(sum(bytes),0)::bigint from ar_assets where seller_id = ${sellerId} and status = 'ready') as storage_bytes,
      (select count(*)::int from analytics_events where seller_id = ${sellerId} and event = 'ar_session_start' and created_at >= date_trunc('month', now())) as ar_sessions_month`;
  const limits = sub?.plan.limits ?? null;
  return {
    sub, plan: sub?.plan ?? null, limits, active: isSubActive(sub),
    usage: { totalSkinners: u.total_skinners as number, activeSkinners: u.active_skinners as number, storageBytes: Number(u.storage_bytes), arSessionsMonth: u.ar_sessions_month as number },
  };
}
export type Entitlement = Awaited<ReturnType<typeof getEntitlement>>;

export function canCreateSkinner(e: Entitlement) {
  if (!e.active) return 'Your subscription is not active. Renew to create Skinners.';
  if (e.limits?.max_skinners != null && e.usage.totalSkinners >= e.limits.max_skinners) return `Your plan allows ${e.limits.max_skinners} Skinners. Upgrade to create more.`;
  return null;
}
export function canPublish(e: Entitlement) {
  if (!e.active) return 'Your subscription is not active. Renew to publish Skinners.';
  if (e.limits?.max_active_skinners != null && e.usage.activeSkinners >= e.limits.max_active_skinners) return `Your plan allows ${e.limits.max_active_skinners} active Skinners. Unpublish one or upgrade.`;
  return null;
}
export function linkExpiry(e: Entitlement): Date | null {
  const days = e.limits?.link_validity_days;
  const byPlan = days ? new Date(Date.now() + days * 864e5) : null;
  return byPlan;
}
export async function assignPlan(sellerId: string, planId: string, provider: 'manual' | 'none' | 'stripe', periodDays: number | null, status: 'trialing' | 'active' = 'active') {
  const end = periodDays ? new Date(Date.now() + periodDays * 864e5) : null;
  await sql`
    insert into subscriptions (seller_id, plan_id, status, provider, current_period_start, current_period_end, expires_at)
    values (${sellerId}, ${planId}, ${status}, ${provider}, now(), ${end}, ${end})
    on conflict (seller_id) do update set plan_id = excluded.plan_id, status = excluded.status, provider = excluded.provider,
      current_period_start = now(), current_period_end = excluded.current_period_end, expires_at = excluded.expires_at, updated_at = now()`;
}
