import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
/** Minimal Stripe REST client (no SDK dependency). Only active when STRIPE_SECRET_KEY is set. */
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;
export async function stripe(path: string, params: Record<string, string>) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || 'Stripe error'); return d;
}
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  const t = Number(parts.t); if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const sig = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const v1 = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  return v1.some(s => s.length === sig.length && timingSafeEqual(Buffer.from(s), Buffer.from(sig)));
}
