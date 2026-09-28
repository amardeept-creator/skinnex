import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle } from '@/lib/server/http';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { EVENTS, SOURCES } from '@/lib/server/analytics';
import { isUuid } from '@/lib/server/ids';

const schema = z.object({
  event: z.enum(EVENTS),
  skinnerId: z.string().nullable().optional(), productId: z.string().nullable().optional(),
  source: z.enum(SOURCES).nullable().optional(), durationMs: z.number().int().min(0).max(3_600_000).nullable().optional(),
  sessionId: z.string().max(64).optional(), device: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
  meta: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
});

/** Public analytics ingest. Seller/brand ownership is resolved server-side from the Skinner/product id,
 *  never trusted from the client. Events for unknown ids are dropped. */
export const POST = handle(async (req: Request) => {
  const ip = clientIp(req);
  if (!rateLimit('ev:' + ip, 240, 60_000).ok) return json({ ok: false }, 429);
  const text = await req.text(); if (text.length > 4000) return json({ ok: false }, 413);
  const b = schema.parse(JSON.parse(text || '{}'));
  const sk = b.skinnerId && isUuid(b.skinnerId) ? b.skinnerId : null;
  const pr = b.productId && isUuid(b.productId) ? b.productId : null;
  if (!sk && !pr) return json({ ok: false }, 422);
  const [owner] = sk
    ? await sql`select s.seller_id, s.brand_id, s.product_id from skinners s where s.id = ${sk}`
    : await sql`select p.seller_id, p.brand_id, p.id as product_id from products p where p.id = ${pr}`;
  if (!owner) return json({ ok: false }, 404);
  // de-duplicate one-per-session events
  if (['product_view', 'skinner_launch', 'link_click', 'ar_session_start', 'tryon', 'tracking_acquired'].includes(b.event) && b.sessionId) {
    const [dup] = await sql`select 1 from analytics_events where session_id = ${b.sessionId} and event = ${b.event} and coalesce(skinner_id::text, product_id::text) = ${sk ?? owner.product_id} and created_at > now() - interval '30 minutes' limit 1`;
    if (dup) return json({ ok: true, dedup: true });
  }
  await sql`insert into analytics_events (event, seller_id, brand_id, product_id, skinner_id, session_id, source, device, duration_ms, meta)
    values (${b.event}, ${owner.seller_id}, ${owner.brand_id}, ${owner.product_id}, ${sk}, ${b.sessionId ?? null}, ${b.source ?? null}, ${b.device ?? null}, ${b.durationMs ?? null}, ${sql.json((b.meta ?? {}) as never)})`;
  if (b.event === 'share') await sql`insert into shares (skinner_id, product_id, kind, channel) values (${sk}, ${owner.product_id}, ${String(b.meta?.kind || 'link') === 'snap_photo' ? 'snap_photo' : String(b.meta?.kind) === 'snap_video' ? 'snap_video' : 'link'}, ${String(b.meta?.channel || 'native').slice(0, 30)})`;
  return json({ ok: true });
});
