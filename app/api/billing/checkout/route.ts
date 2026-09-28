import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { stripe, stripeEnabled } from '@/lib/server/stripe';

/** Starts a Stripe Checkout subscription session. Without Stripe configured this returns 501 —
 *  SKINIFY never pretends a payment succeeded. Plans can then only be assigned by an admin. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req); const u = await requireSeller();
  const { planId } = z.object({ planId: z.string() }).parse(await req.json());
  const [plan] = await sql`select * from subscription_plans where id = ${planId} and active`;
  if (!plan || plan.price_cents == null || plan.price_cents === 0) throw new HttpError(400, 'This plan cannot be purchased online.');
  if (!stripeEnabled() || !plan.stripe_price_id) throw new HttpError(501, 'Online payments are not configured on this deployment yet. Contact SKINIFY to activate this plan.', 'billing_not_configured');
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const s = await stripe('checkout/sessions', {
    mode: 'subscription', 'line_items[0][price]': plan.stripe_price_id, 'line_items[0][quantity]': '1',
    success_url: `${origin}/dashboard/subscription?checkout=success`, cancel_url: `${origin}/dashboard/subscription?checkout=cancel`,
    client_reference_id: u.sellerId, 'metadata[seller_id]': u.sellerId, 'metadata[plan_id]': plan.id, 'subscription_data[metadata][seller_id]': u.sellerId, 'subscription_data[metadata][plan_id]': plan.id, customer_email: u.email,
  });
  return json({ url: s.url });
});
