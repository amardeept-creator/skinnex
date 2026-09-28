import { sql } from '@/lib/server/db';
import { json, handle, assertSameOrigin, HttpError } from '@/lib/server/http';
import { requireSeller } from '@/lib/server/auth';
import { ingestAsset, type AssetKind } from '@/lib/server/assets';
import { storageDriver } from '@/lib/server/storage';
import { rateLimit } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const GET = handle(async () => {
  const u = await requireSeller();
  const rows = await sql`select id, kind, url, mime, bytes, original_bytes, meta, original_filename, created_at, is_template, template_name from ar_assets
    where status = 'ready' and (seller_id = ${u.sellerId} or is_template) order by is_template, created_at desc limit 200`;
  return json({ items: rows, driver: storageDriver(), directLimit: 4 * 1048576 });
});

/** Direct multipart upload (≤ 4 MB — Vercel functions cap request bodies at 4.5 MB). Larger files use /api/assets/token. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireSeller();
  if (!rateLimit('up:' + u.sellerId, 60, 3600_000).ok) throw new HttpError(429, 'Upload limit reached. Try again later.');
  const form = await req.formData();
  const file = form.get('file'); const kind = String(form.get('kind') || '') as AssetKind;
  if (!(file instanceof File)) throw new HttpError(400, 'No file');
  if (!['model', 'image', 'video'].includes(kind)) throw new HttpError(400, 'Bad kind');
  const buf = new Uint8Array(await file.arrayBuffer());
  const row = await ingestAsset(u.sellerId, buf, file.name, kind);
  return json({ asset: row }, 201);
});
