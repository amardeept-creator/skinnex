import type { Metadata, Viewport } from 'next';
import { resolvePublicSkinner, type PublicSkinner } from '@/lib/server/links';
import { toARData } from '@/lib/server/ardata';
import { ARExperience } from '@/components/ar/ARExperience';
import { LinkStateScreen } from '@/components/ar/LinkStateScreen';
import { SOURCES } from '@/lib/server/analytics';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
export const viewport: Viewport = { themeColor: '#0d0b10', width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover' };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await resolvePublicSkinner((await params).slug);
  if (r.state === 'invalid') return { title: 'Skinner not found', robots: { index: false } };
  const s = r as PublicSkinner;
  return { title: `Try on ${s.product.name} — ${s.brand.name}`, description: `See ${s.product.name} on you with live AR. No app needed.`, openGraph: { images: s.product.images[0]?.url ? [s.product.images[0].url] : [] } };
}

export default async function SkinnerPage({ params, searchParams }: P) {
  const { slug } = await params; const sp = await searchParams;
  const r = await resolvePublicSkinner(slug);
  if (r.state !== 'ok') {
    const s = r.state === 'invalid' ? null : (r as PublicSkinner);
    return <LinkStateScreen state={r.state} brand={s ? s.brand : null} product={s ? { name: s.product.name, slug: s.product.slug, image: s.product.images[0]?.url } : null} sellerHint />;
  }
  const source = (SOURCES as readonly string[]).includes(sp.src || '') && sp.src !== 'preview' ? sp.src! : 'link';
  return <ARExperience data={toARData(r as PublicSkinner)} source={source} />;
}
