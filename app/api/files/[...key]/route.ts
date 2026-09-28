import { readLocal, storageDriver } from '@/lib/server/storage';
const TYPES: Record<string, string> = { glb: 'model/gltf-binary', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
/** Local-development file server for uploads (production uses Vercel Blob CDN URLs). */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (storageDriver() !== 'local') return new Response('Not found', { status: 404 });
  const key = (await ctx.params).key.join('/');
  if (!/^[\w\-/.]+$/.test(key) || key.includes('..')) return new Response('Bad key', { status: 400 });
  try {
    const buf = await readLocal(key);
    return new Response(new Uint8Array(buf), { headers: { 'content-type': TYPES[key.split('.').pop() || ''] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
