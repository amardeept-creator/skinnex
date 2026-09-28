import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, HttpError } from '@/lib/server/http';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
const schema = z.object({ productId: z.string().uuid().optional(), skinnerId: z.string().uuid().optional(), reason: z.enum(['misleading', 'offensive', 'ip', 'broken', 'other']), details: z.string().max(1000).default('') });
export const POST = handle(async (req: Request) => {
  if (!rateLimit('report:' + clientIp(req), 10, 3600_000).ok) throw new HttpError(429, 'Too many reports');
  const b = schema.parse(await req.json());
  if (!b.productId && !b.skinnerId) throw new HttpError(400, 'Nothing to report');
  await sql`insert into reports (product_id, skinner_id, reason, details) values (${b.productId ?? null}, ${b.skinnerId ?? null}, ${b.reason}, ${b.details})`;
  return json({ ok: true }, 201);
});
