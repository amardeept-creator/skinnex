import type { Metadata } from 'next';
import { resolvePublicSkinner, type PublicSkinner } from '@/lib/server/links';
import { toARData } from '@/lib/server/ardata';
import { ARExperience } from '@/components/ar/ARExperience';
import { LinkStateScreen } from '@/components/ar/LinkStateScreen';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false } };

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await resolvePublicSkinner((await params).slug);
  if (r.state !== 'ok') return <LinkStateScreen state={r.state} />;
  const s = r as PublicSkinner;
  if (!s.embed) return <LinkStateScreen state="unpublished" brand={s.brand} product={{ name: s.product.name, slug: s.product.slug }} />;
  return <div style={{ position: 'fixed', inset: 0 }}><ARExperience data={toARData(s)} source="embed" embedded /></div>;
}
