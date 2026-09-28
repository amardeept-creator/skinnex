import { listProducts } from '@/lib/server/catalog';
import { json, handle } from '@/lib/server/http';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
export const GET = handle(async (req: Request) => {
  if (!rateLimit('search:' + clientIp(req), 120, 60_000).ok) return json({ error: 'Too many requests' }, 429);
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') || '').slice(0, 80);
  const { items, total } = await listProducts({ q, limit: Math.min(24, Number(u.searchParams.get('limit') || 12)) });
  return json({ items, total }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } });
});
