/** Fixed-window in-memory limiter. Per serverless instance only — for strict global limits
 *  configure Upstash/Vercel KV (see README "Rate limiting"). */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now(); const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return { ok: true, remaining: limit - 1 }; }
  b.n++; if (buckets.size > 50_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return { ok: b.n <= limit, remaining: Math.max(0, limit - b.n) };
}
export function clientIp(req: Request) {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}
