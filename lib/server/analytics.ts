import 'server-only';
import { sql } from './db';

export const EVENTS = ['product_view', 'skinner_launch', 'link_click', 'camera_granted', 'camera_denied', 'ar_session_start', 'tracking_acquired', 'tryon', 'capture_photo', 'capture_video', 'share', 'buy_click', 'session_end', 'fallback_3d', 'ar_error'] as const;
export type EventName = (typeof EVENTS)[number];
export const SOURCES = ['link', 'qr', 'embed', 'discover', 'share', 'direct', 'preview'] as const;

export async function sellerSummary(sellerId: string, days: number, skinnerId?: string | null) {
  const since = new Date(Date.now() - days * 864e5);
  const sk = skinnerId ?? null;
  const [totals] = await sql`
    select
      count(*) filter (where event = 'product_view')::int as product_views,
      count(*) filter (where event = 'link_click')::int as link_clicks,
      count(*) filter (where event = 'skinner_launch')::int as launches,
      count(*) filter (where event = 'ar_session_start')::int as ar_sessions,
      count(*) filter (where event = 'tracking_acquired')::int as tracked,
      count(*) filter (where event = 'tryon')::int as tryons,
      count(*) filter (where event in ('capture_photo','capture_video'))::int as captures,
      count(*) filter (where event = 'share')::int as shares,
      count(*) filter (where event = 'buy_click')::int as buy_clicks,
      count(*) filter (where event = 'camera_denied')::int as camera_denied,
      coalesce(avg(duration_ms) filter (where event = 'session_end' and duration_ms > 0), 0)::int as avg_session_ms
    from analytics_events where seller_id = ${sellerId} and created_at >= ${since} and (${sk}::uuid is null or skinner_id = ${sk}::uuid)`;
  const daily = await sql`
    select to_char(d, 'YYYY-MM-DD') as day,
      coalesce(sum(case when e.event = 'tryon' then 1 else 0 end), 0)::int as tryons,
      coalesce(sum(case when e.event = 'skinner_launch' then 1 else 0 end), 0)::int as launches,
      coalesce(sum(case when e.event = 'product_view' then 1 else 0 end), 0)::int as views
    from generate_series(date_trunc('day', ${since}::timestamptz), date_trunc('day', now()), interval '1 day') d
    left join analytics_events e on e.seller_id = ${sellerId} and date_trunc('day', e.created_at) = d and (${sk}::uuid is null or e.skinner_id = ${sk}::uuid)
    group by d order by d`;
  const sources = await sql`select coalesce(source,'direct') as source, count(*)::int as n from analytics_events where seller_id = ${sellerId} and event = 'skinner_launch' and created_at >= ${since} and (${sk}::uuid is null or skinner_id = ${sk}::uuid) group by 1 order by 2 desc`;
  const devices = await sql`select coalesce(device,'unknown') as device, count(*)::int as n from analytics_events where seller_id = ${sellerId} and event = 'skinner_launch' and created_at >= ${since} and (${sk}::uuid is null or skinner_id = ${sk}::uuid) group by 1 order by 2 desc`;
  const top = await sql`
    select s.id, s.name, p.images->0->>'url' as image,
      count(e.*) filter (where e.event = 'tryon')::int as tryons,
      count(e.*) filter (where e.event = 'skinner_launch')::int as launches,
      count(e.*) filter (where e.event = 'product_view')::int as views,
      count(e.*) filter (where e.event = 'share')::int as shares,
      count(e.*) filter (where e.event = 'buy_click')::int as buy_clicks
    from skinners s join products p on p.id = s.product_id
    left join analytics_events e on e.skinner_id = s.id and e.created_at >= ${since}
    where s.seller_id = ${sellerId} group by s.id, s.name, p.images order by tryons desc, launches desc, s.created_at desc limit 10`;
  return { totals, daily, sources, devices, top };
}
