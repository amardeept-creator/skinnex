import QRCode from 'qrcode';
import { sql } from '@/lib/server/db';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';

/** QR codes encode the public Skinner URL with ?src=qr so scans are attributed. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return new Response('Bad slug', { status: 400 });
  if (!rateLimit('qr:' + clientIp(req), 120, 60_000).ok) return new Response('Too many requests', { status: 429 });
  const [l] = await sql`select 1 from public_links where slug = ${slug}`;
  if (!l) return new Response('Not found', { status: 404 });
  const u = new URL(req.url);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || u.origin).replace(/\/$/, '');
  const target = `${origin}/s/${slug}?src=qr`;
  const format = u.searchParams.get('format') === 'png' ? 'png' : 'svg';
  const size = Math.min(2048, Math.max(128, Number(u.searchParams.get('size') || 1024)));
  const opts = { margin: 2, errorCorrectionLevel: 'M' as const, color: { dark: '#17141C', light: '#FFFFFF' } };
  const dl = u.searchParams.has('download') ? { 'content-disposition': `attachment; filename="skinify-${slug}.${format}"` } : {} as Record<string, string>;
  if (format === 'png') {
    const buf = await QRCode.toBuffer(target, { ...opts, width: size, type: 'png' });
    return new Response(new Uint8Array(buf), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400', ...dl } });
  }
  const svg = await QRCode.toString(target, { ...opts, type: 'svg' });
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400', ...dl } });
}
