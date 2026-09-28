import 'server-only';
import type { PublicSkinner } from './links';
import type { ARData } from '@/components/ar/ARExperience';
export function toARData(s: PublicSkinner): ARData {
  return {
    skinnerId: s.skinnerId, productId: s.productId, slug: s.slug, profileKey: s.profile, config: s.config, modelUrl: s.modelUrl,
    product: { name: s.product.name, slug: s.product.slug, description: s.product.description, price_cents: s.product.price_cents, currency: s.product.currency, purchase_url: s.product.purchase_url, images: s.product.images },
    brand: { name: s.brand.name, slug: s.brand.slug, logo_url: s.brand.logo_url, accent: s.brand.accent },
    variants: s.variants as ARData['variants'], branding: s.branding, isDemo: s.isDemo,
  };
}
