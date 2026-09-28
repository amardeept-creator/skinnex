import { sql } from '@/lib/server/db';
import { verifyStripeSignature } from '@/lib/server/stripe';

/** Stripe webhook → the only path that activates a paid plan. Signature-verified. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Billing not configured', { status: 501 });
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), secret)) return new Response('Bad signature', { status: 400 });
  const ev = JSON.parse(payload);
  const obj = ev.data?.object || {};
  if (ev.type === 'customer.subscription.created' || ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.deleted') {
    const sellerId = obj.metadata?.seller_id; const planId = obj.metadata?.plan_id;
    if (sellerId && planId) {
      const map: Record<string, string> = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled', unpaid: 'expired', incomplete_expired: 'expired' };
      const status = map[obj.status] || 'expired';
      const end = obj.current_period_end ? new Date(obj.current_period_end * 1000) : null;
      const expires = ev.type === 'customer.subscription.deleted' ? new Date() : status === 'past_due' && end ? new Date(end.getTime() + 7 * 864e5) : end;
      await sql`insert into subscriptions (seller_id, plan_id, status, provider, provider_customer_id, provider_subscription_id, current_period_start, current_period_end, expires_at, cancel_at_period_end)
        values (${sellerId}, ${planId}, ${status}, 'stripe', ${obj.customer}, ${obj.id}, ${obj.current_period_start ? new Date(obj.current_period_start * 1000) : new Date()}, ${end}, ${expires}, ${!!obj.cancel_at_period_end})
        on conflict (seller_id) do update set plan_id = excluded.plan_id, status = excluded.status, provider = 'stripe', provider_customer_id = excluded.provider_customer_id, provider_subscription_id = excluded.provider_subscription_id,
          current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end, expires_at = excluded.expires_at, cancel_at_period_end = excluded.cancel_at_period_end, updated_at = now()`;
    }
  }
  return new Response('ok');
}
