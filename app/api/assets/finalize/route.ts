import { z } from 'zod';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { ingestAsset, uploadQuota } from '@/lib/server/assets';
import { fetchObject, deleteObject } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;
const schema = z.object({ url: z.string().url(), kind: z.enum(['model', 'image', 'video']), filename: z.string().max(200) });

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireSeller();
  const b = schema.parse(await req.json());
  const url = new URL(b.url);
  if (!/\.public\.blob\.vercel-storage\.com$/.test(url.hostname) || !url.pathname.startsWith(`/staging/${u.sellerId}/`)) throw new HttpError(400, 'Unexpected upload location');
  const max = await uploadQuota(u.sellerId, b.kind);
  try {
    const buf = await fetchObject(b.url, max);
    const row = await ingestAsset(u.sellerId, new Uint8Array(buf), b.filename, b.kind);
    return json({ asset: row }, 201);
  } finally { await deleteObject(b.url); }
});
