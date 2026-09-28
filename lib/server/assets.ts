import 'server-only';
import { sql } from './db';
import { putObject, storageDriver, deleteObject } from './storage';
import { processGlb, sniffImage, sniffVideo, gltfJsonToGlb, type GlbReport } from './glb';
import { getEntitlement } from './entitlements';
import { shortId } from './ids';
import { HttpError } from './http';

export type AssetKind = 'model' | 'image' | 'video';
const EXT: Record<string, string> = { 'model/gltf-binary': 'glb', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' };

/** Plan-aware quota check; returns max bytes allowed for one file. */
export async function uploadQuota(sellerId: string, kind: AssetKind) {
  const e = await getEntitlement(sellerId);
  if (!e.active) throw new HttpError(402, 'Your subscription is inactive. Renew to upload new assets.');
  const maxMb = e.limits?.max_upload_mb ?? 15; const storageMb = e.limits?.storage_mb ?? 100;
  const remaining = storageMb * 1048576 - e.usage.storageBytes;
  if (remaining <= 0) throw new HttpError(413, 'You’ve used all asset storage in your plan. Delete unused assets or upgrade.');
  const cap = kind === 'image' ? Math.min(10, maxMb) : maxMb;
  return Math.min(cap * 1048576, remaining);
}

/** Validates bytes (magic-number sniffing, never trusting the client MIME), optimises GLBs, stores, records. */
export async function ingestAsset(sellerId: string, input: Uint8Array, filename: string, kind: AssetKind) {
  const max = await uploadQuota(sellerId, kind);
  if (input.length > max) throw new HttpError(413, `File is ${(input.length / 1048576).toFixed(1)} MB; your plan allows ${(max / 1048576).toFixed(0)} MB.`);
  let mime: string | null = null; let body = input; let report: GlbReport | null = null;
  if (kind === 'model') {
    if (input[0] === 0x7b /* { */) {
      try { body = await gltfJsonToGlb(input); } catch (e) { throw new HttpError(422, (e as Error).message || 'Invalid .gltf file'); }
    }
    const r = await processGlb(body); report = r.report;
    if (!r.report.ok) throw new HttpError(422, r.report.error || 'Invalid 3D model');
    body = r.output; mime = 'model/gltf-binary';
  } else if (kind === 'image') { mime = sniffImage(input); if (!mime) throw new HttpError(415, 'Images must be PNG, JPEG or WebP.'); }
  else if (kind === 'video') { mime = sniffVideo(input); if (!mime) throw new HttpError(415, 'Videos must be MP4 or WebM.'); }
  if (!mime) throw new HttpError(415, 'Unsupported file type');
  if (storageDriver() === 'none') throw new HttpError(503, 'File storage is not configured on this deployment (set BLOB_READ_WRITE_TOKEN).');
  const safeName = filename.replace(/[^\w.\- ]+/g, '').slice(0, 120) || `upload.${EXT[mime]}`;
  const key = `sellers/${sellerId}/${kind}s/${Date.now().toString(36)}-${shortId(6)}.${EXT[mime]}`;
  const { url } = await putObject(key, body, mime);
  const meta = report ? { bbox: report.bbox, triangles: report.triangles, meshes: report.meshes, materials: report.materials, textures: report.textures, maxTextureSize: report.maxTextureSize, extensions: report.extensions, warnings: report.warnings, optimized: report.optimized } : {};
  const [row] = await sql`insert into ar_assets (seller_id, kind, storage_key, url, original_filename, mime, bytes, original_bytes, meta)
    values (${sellerId}, ${kind}, ${key}, ${url}, ${safeName}, ${mime}, ${body.length}, ${input.length}, ${sql.json(meta as never)}) returning id, kind, url, mime, bytes, original_bytes, meta, original_filename, created_at`;
  return row;
}

export async function deleteAsset(sellerId: string, id: string) {
  const [a] = await sql`select id, url, is_template from ar_assets where id = ${id} and seller_id = ${sellerId}`;
  if (!a) throw new HttpError(404, 'Asset not found');
  const [used] = await sql`select 1 from skinners where asset_id = ${id} limit 1`;
  if (used) throw new HttpError(409, 'This asset is used by a Skinner. Replace it there first.');
  await sql`update ar_assets set status = 'deleted' where id = ${id}`;
  await deleteObject(a.url);
}
