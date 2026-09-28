import { z } from 'zod';
import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { createApiKey } from '@/lib/server/apikeys';
import { getEntitlement } from '@/lib/server/entitlements';
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req); const u = await requireSeller();
  const e = await getEntitlement(u.sellerId); if (!e.limits?.api_access) throw new HttpError(403, 'API access is available on Business and Enterprise plans.');
  const { name } = z.object({ name: z.string().trim().min(1).max(40) }).parse(await req.json());
  return json({ key: await createApiKey(u.sellerId, name) }, 201);
});
