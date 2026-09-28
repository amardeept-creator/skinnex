import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Object storage abstraction.
 *  - production: Vercel Blob (BLOB_READ_WRITE_TOKEN) → public CDN URLs, immutable caching
 *  - local dev:  .data/uploads served by /api/files/[...key]
 * Large 3D assets never live in the application bundle.
 */
export type Driver = 'blob' | 'local' | 'none';
export function storageDriver(): Driver {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.VERCEL) return 'none'; // serverless FS is read-only: uploads require Blob
  return 'local';
}
const LOCAL_ROOT = path.join(process.cwd(), '.data', 'uploads');

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  const d = storageDriver();
  if (d === 'blob') {
    const { put } = await import('@vercel/blob');
    const r = await put(key, Buffer.from(body), { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
    return { key, url: r.url };
  }
  if (d === 'local') {
    const p = path.join(LOCAL_ROOT, key); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, body);
    return { key, url: `/api/files/${key}` };
  }
  throw new Error('STORAGE_NOT_CONFIGURED');
}

export async function readLocal(key: string) {
  const p = path.normalize(path.join(LOCAL_ROOT, key));
  if (!p.startsWith(LOCAL_ROOT)) throw new Error('bad key');
  return fs.readFile(p);
}

export async function deleteObject(url: string) {
  try {
    if (storageDriver() === 'blob' && /blob\.vercel-storage\.com/.test(url)) { const { del } = await import('@vercel/blob'); await del(url); }
  } catch (e) { console.warn('[storage] delete failed', e); }
}

export async function fetchObject(url: string, maxBytes: number) {
  const r = await fetch(url); if (!r.ok) throw new Error('fetch failed');
  const len = Number(r.headers.get('content-length') || 0); if (len > maxBytes) throw new Error('too large');
  const b = Buffer.from(await r.arrayBuffer()); if (b.length > maxBytes) throw new Error('too large');
  return b;
}
