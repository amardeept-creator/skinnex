import { json, handle } from '@/lib/server/http';
import { authApiKey } from '@/lib/server/apikeys';
import { sellerSummary } from '@/lib/server/analytics';
export const GET = handle(async (req: Request) => {
  const sellerId = await authApiKey(req);
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days') || 30)));
  const s = await sellerSummary(sellerId, days);
  return json({ days, totals: s.totals, daily: s.daily, sources: s.sources, devices: s.devices, top: s.top });
});
