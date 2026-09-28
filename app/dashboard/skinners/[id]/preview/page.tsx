import { notFound } from 'next/navigation';
import { pageSeller } from '@/lib/server/auth';
import { getOwnedSkinner } from '@/lib/server/skinners';
import { getEntitlement } from '@/lib/server/entitlements';
import { ARExperience } from '@/components/ar/ARExperience';

/** Seller preview: works for drafts too, never counted in analytics. */
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const u = await pageSeller(); const { id } = await params;
  const s = await getOwnedSkinner(u.sellerId, id); if (!s) notFound();
  const e = await getEntitlement(u.sellerId);
  return <ARExperience preview data={{
    skinnerId: s.id, productId: s.product_id, slug: s.link_slug, profileKey: s.tracking_profile, config: s.config, modelUrl: s.model_url,
    product: { name: s.p_name, slug: s.p_slug, description: s.description, price_cents: s.price_cents, currency: s.currency, purchase_url: s.purchase_url, images: s.images || [] },
    brand: { name: s.brand_name, slug: s.brand_slug, logo_url: s.brand_logo, accent: s.brand_accent },
    variants: s.variants, branding: !e.limits?.remove_branding, isDemo: false,
  }} />;
}
