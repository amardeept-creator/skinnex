import 'server-only';
import { TRACKING_PROFILES, buildDefaultConfig, type ARConfig } from '@/lib/ar/config';

export const MOCK_CATEGORIES = [
  { slug: 'jewellery', name: 'Jewellery', description: 'Rings, earrings, necklaces and bracelets', default_profile: 'finger_ring', tint: '#F3E9DD', sort: 1, active: true },
  { slug: 'nails', name: 'Nails', description: 'Press-ons and nail designs', default_profile: 'nails', tint: '#F8E1E7', sort: 2, active: true },
  { slug: 'watches', name: 'Watches', description: 'Wrist-tracked timepieces', default_profile: 'wrist_watch', tint: '#E6E9EE', sort: 3, active: true },
  { slug: 'eyewear', name: 'Eyewear', description: 'Sunglasses and optical frames', default_profile: 'face_glasses', tint: '#E9E4F7', sort: 4, active: true },
  { slug: 'beauty', name: 'Beauty', description: 'Lip colour and beauty accessories', default_profile: 'face_lips', tint: '#F6DDE0', sort: 5, active: true },
  { slug: 'fashion', name: 'Fashion', description: 'Headwear and garments', default_profile: 'head_hat', tint: '#EEE6E1', sort: 6, active: true },
  { slug: 'accessories', name: 'Accessories', description: 'Bags and everyday accessories', default_profile: 'body_bag', tint: '#ECE7DC', sort: 7, active: true },
  { slug: 'footwear', name: 'Footwear', description: 'Shoes and sneakers', default_profile: 'feet_shoes', tint: '#E3E8E4', sort: 8, active: true },
  { slug: 'home', name: 'Home', description: 'Objects you can place in your room', default_profile: 'surface_place', tint: '#EFE8DF', sort: 9, active: true },
  { slug: 'more', name: 'More', description: 'Everything else', default_profile: 'surface_place', tint: '#ECECEC', sort: 10, active: true },
];

export const MOCK_BRANDS = [
  { id: 'b0000000-0000-0000-0000-000000000001', slug: 'aurelle', name: 'Aurelle Fine Jewellery', tagline: 'Heirloom pieces, made to be tried.', accent: '#B8893B', description: 'Recycled gold and ethically sourced stones, hand-finished in small batches.', website: null, logo_url: null, is_featured: true, is_demo: true, status: 'active' },
  { id: 'b0000000-0000-0000-0000-000000000002', slug: 'meridian', name: 'Meridian Watch Co.', tagline: 'Quiet design for everyday wrists.', accent: '#2E3A4B', description: 'Minimal mechanical watches with interchangeable straps.', website: null, logo_url: null, is_featured: true, is_demo: true, status: 'active' },
  { id: 'b0000000-0000-0000-0000-000000000003', slug: 'optika', name: 'Optika Studio', tagline: 'Frames with a point of view.', accent: '#1E1E24', description: 'Acetate and titanium eyewear designed for every face.', website: null, logo_url: null, is_featured: true, is_demo: true, status: 'active' },
  { id: 'b0000000-0000-0000-0000-000000000004', slug: 'lacquer-lab', name: 'Lacquer Lab', tagline: 'Salon nails, no appointment.', accent: '#D0668A', description: 'Reusable press-on nails and long-wear lip colour.', website: null, logo_url: null, is_featured: true, is_demo: true, status: 'active' },
  { id: 'b0000000-0000-0000-0000-000000000005', slug: 'nomad-knit', name: 'Nomad Knit', tagline: 'Soft goods for slow travel.', accent: '#8C6A5D', description: 'Merino knitwear and canvas carry goods.', website: null, logo_url: null, is_featured: false, is_demo: true, status: 'active' },
  { id: 'b0000000-0000-0000-0000-000000000006', slug: 'terra-home', name: 'Terra Home', tagline: 'Objects with patience.', accent: '#9A7B5F', description: 'Hand-thrown ceramics for calm rooms.', website: null, logo_url: null, is_featured: false, is_demo: true, status: 'active' },
];

export const MOCK_PLANS = [
  { id: 'trial', name: 'Trial', description: 'Try SKINIFY free for 14 days.', price_cents: 0, currency: 'USD', billing_interval: 'month', trial_days: 14, is_default: true, is_public: true, sort: 1, stripe_price_id: null, active: true,
    limits: { max_active_skinners: 2, max_skinners: 5, link_validity_days: null, monthly_ar_sessions: 500, storage_mb: 100, max_upload_mb: 15, analytics: 'basic' as const, remove_branding: false, embed: true, api_access: false, qr: true } },
  { id: 'starter', name: 'Starter', description: 'For independent makers launching their first Skinners.', price_cents: 1900, currency: 'USD', billing_interval: 'month', trial_days: 0, is_default: false, is_public: true, sort: 2, stripe_price_id: null, active: true,
    limits: { max_active_skinners: 10, max_skinners: 25, link_validity_days: 90, monthly_ar_sessions: 5000, storage_mb: 1024, max_upload_mb: 25, analytics: 'basic' as const, remove_branding: false, embed: true, api_access: false, qr: true } },
  { id: 'pro', name: 'Pro', description: 'For growing brands selling across channels.', price_cents: 5900, currency: 'USD', billing_interval: 'month', trial_days: 0, is_default: false, is_public: true, sort: 3, stripe_price_id: null, active: true,
    limits: { max_active_skinners: 50, max_skinners: 150, link_validity_days: 365, monthly_ar_sessions: 25000, storage_mb: 5120, max_upload_mb: 50, analytics: 'advanced' as const, remove_branding: true, embed: true, api_access: false, qr: true } },
  { id: 'business', name: 'Business', description: 'High-volume catalogues, API access and white-label AR.', price_cents: 19900, currency: 'USD', billing_interval: 'month', trial_days: 0, is_default: false, is_public: true, sort: 4, stripe_price_id: null, active: true,
    limits: { max_active_skinners: 250, max_skinners: 1000, link_validity_days: null, monthly_ar_sessions: 150000, storage_mb: 25600, max_upload_mb: 100, analytics: 'advanced' as const, remove_branding: true, embed: true, api_access: true, qr: true } },
  { id: 'enterprise', name: 'Enterprise', description: 'Custom limits, SLAs and dedicated onboarding.', price_cents: null, currency: 'USD', billing_interval: 'month', trial_days: 0, is_default: false, is_public: true, sort: 5, stripe_price_id: null, active: true,
    limits: { max_active_skinners: null, max_skinners: null, link_validity_days: null, monthly_ar_sessions: null, storage_mb: 512000, max_upload_mb: 200, analytics: 'advanced' as const, remove_branding: true, embed: true, api_access: true, qr: true } },
];

const metal = (hex: string) => ({ materials: { metal: { color: hex } } });

interface DemoRaw {
  brand: string;
  slug: string;
  name: string;
  category: string;
  model?: string;
  img: string;
  price: number;
  profile: string;
  link: string;
  desc: string;
  tags: string[];
  colors: string[];
  featured?: boolean;
  cfg?: Partial<ARConfig>;
  variants?: { name: string; hex: string; ov: Record<string, unknown> }[];
}

const RAW_DEMOS: DemoRaw[] = [
  { brand: 'aurelle', slug: 'solitaire-diamond-ring', name: 'Solitaire Diamond Ring', category: 'jewellery', model: 'ring-solitaire', img: 'ring-solitaire', price: 1290, profile: 'finger_ring', link: 'diamond-ring', featured: true,
    desc: 'A 6.5 mm brilliant-cut stone held high in a six-claw crown on a slim comfort-fit band.', tags: ['diamond', 'engagement', 'ring', 'solitaire', 'party'], colors: ['gold', 'rose', 'silver'],
    variants: [{ name: 'Yellow gold', hex: '#E9C27A', ov: metal('#FFC766') }, { name: 'Rose gold', hex: '#EBB39F', ov: metal('#F7B39A') }, { name: 'Platinum', hex: '#E8E6E1', ov: metal('#F4F2EE') }] },
  { brand: 'aurelle', slug: 'rose-eternity-band', name: 'Rose Eternity Band', category: 'jewellery', model: 'ring-eternity', img: 'ring-eternity', price: 890, profile: 'finger_ring', link: 'eternity-band',
    desc: 'Twenty-two stones set all the way round a rose-gold band.', tags: ['ring', 'band', 'stacking', 'rose gold', 'diamond'], colors: ['rose', 'gold'],
    variants: [{ name: 'Rose gold', hex: '#EBB39F', ov: metal('#F7B39A') }, { name: 'Yellow gold', hex: '#E9C27A', ov: metal('#FFC766') }] },
  { brand: 'aurelle', slug: 'emerald-cut-signet', name: 'Emerald Cut Ring', category: 'jewellery', model: 'ring-emerald', img: 'ring-emerald', price: 640, profile: 'finger_ring', link: 'emerald-ring', cfg: { finger: 'index' },
    desc: 'A step-cut green stone in a sterling silver bezel. Worn on the index finger by default.', tags: ['ring', 'emerald', 'green', 'silver', 'statement'], colors: ['silver', 'green'] },
  { brand: 'aurelle', slug: 'baroque-pearl-drops', name: 'Pearl Drop Earrings', category: 'jewellery', model: 'earring-pearl', img: 'earring-pearl', price: 180, profile: 'face_earrings', link: 'pearl-earrings', featured: true,
    desc: 'Freshwater pearls on gold-filled hooks that swing as you move.', tags: ['earrings', 'pearl', 'drop', 'gold', 'party', 'bridal'], colors: ['white', 'gold'] },
  { brand: 'aurelle', slug: 'everyday-gold-hoops', name: 'Everyday Gold Hoops', category: 'jewellery', model: 'earring-hoop', img: 'earring-hoop', price: 120, profile: 'face_earrings', link: 'gold-hoops',
    desc: 'Lightweight 25 mm hoops for every day.', tags: ['earrings', 'hoops', 'gold'], colors: ['gold', 'silver'],
    variants: [{ name: 'Gold', hex: '#E9C27A', ov: metal('#FFC766') }, { name: 'Silver', hex: '#DADADA', ov: metal('#F2F2F2') }] },
  { brand: 'aurelle', slug: 'halo-pendant-necklace', name: 'Halo Pendant Necklace', category: 'jewellery', model: 'necklace-halo', img: 'necklace-halo', price: 420, profile: 'body_necklace', link: 'halo-necklace',
    desc: 'A pear-shaped stone framed by a fine halo on an 18-inch trace chain.', tags: ['necklace', 'pendant', 'gold', 'diamond', 'party'], colors: ['gold'] },
  { brand: 'aurelle', slug: 'tennis-bracelet', name: 'Line Tennis Bracelet', category: 'jewellery', model: 'bracelet-tennis', img: 'bracelet-tennis', price: 1150, profile: 'wrist_bracelet', link: 'tennis-bracelet',
    desc: 'Forty-six stones in a flexible silver line.', tags: ['bracelet', 'tennis', 'silver', 'diamond'], colors: ['silver'] },
  { brand: 'aurelle', slug: 'sculpted-gold-bangle', name: 'Sculpted Gold Bangle', category: 'jewellery', model: 'bangle-gold', img: 'bangle-gold', price: 360, profile: 'wrist_bracelet', link: 'gold-bangle',
    desc: 'A softly oval bangle with a high polish.', tags: ['bangle', 'bracelet', 'gold'], colors: ['gold'] },
  { brand: 'meridian', slug: 'meridian-automatic-40', name: 'Meridian Automatic 40', category: 'watches', model: 'watch-meridian', img: 'watch-meridian', price: 450, profile: 'wrist_watch', link: 'meridian-40', featured: true,
    desc: '40 mm steel case, domed crystal and a vegetable-tanned leather strap.', tags: ['watch', 'automatic', 'leather', 'steel', 'minimal'], colors: ['silver', 'brown', 'black'],
    variants: [{ name: 'Tan leather', hex: '#6B4428', ov: { materials: { strap: { color: '#6B4428' } } } }, { name: 'Black leather', hex: '#18181B', ov: { materials: { strap: { color: '#18181B' } } } }, { name: 'Navy canvas', hex: '#22304A', ov: { materials: { strap: { color: '#22304A', roughness: 0.9 } } } }] },
  { brand: 'meridian', slug: 'noir-chrono-42', name: 'Noir Chrono 42', category: 'watches', model: 'watch-noir', img: 'watch-noir', price: 520, profile: 'wrist_watch', link: 'noir-chrono',
    desc: 'Black PVD case, midnight dial and gilt hands.', tags: ['watch', 'black', 'chronograph'], colors: ['black', 'gold'] },
  { brand: 'optika', slug: 'wayfarer-noir', name: 'Wayfarer Noir Sunglasses', category: 'eyewear', model: 'glasses-wayfarer', img: 'glasses-wayfarer', price: 160, profile: 'face_glasses', link: 'wayfarer-noir', featured: true,
    desc: 'Polished black acetate with smoke lenses.', tags: ['sunglasses', 'black', 'wayfarer', 'acetate'], colors: ['black', 'brown', 'pink'],
    variants: [{ name: 'Noir', hex: '#121214', ov: { materials: { frame: { color: '#121214' } } } }, { name: 'Havana', hex: '#5A3A22', ov: { materials: { frame: { color: '#5A3A22' } } } }, { name: 'Rose crystal', hex: '#E8B7C3', ov: { materials: { frame: { color: '#E8B7C3', roughness: 0.15 } } } }] },
  { brand: 'optika', slug: 'round-wire-optical', name: 'Round Wire Optical', category: 'eyewear', model: 'glasses-round', img: 'glasses-round', price: 140, profile: 'face_glasses', link: 'round-wire',
    desc: 'A featherweight titanium round frame with clear lenses.', tags: ['glasses', 'optical', 'round', 'gold', 'titanium'], colors: ['gold', 'silver'],
    variants: [{ name: 'Gold', hex: '#E9C27A', ov: { materials: { frame: { color: '#FFC773' } } } }, { name: 'Silver', hex: '#D9D9D9', ov: { materials: { frame: { color: '#EDEDED' } } } }] },
  { brand: 'optika', slug: 'aviator-gradient', name: 'Aviator Gradient', category: 'eyewear', model: 'glasses-aviator', img: 'glasses-aviator', price: 190, profile: 'face_glasses', link: 'aviator',
    desc: 'Thin metal double-bridge aviators with brown lenses.', tags: ['sunglasses', 'aviator', 'silver', 'brown'], colors: ['silver', 'brown'] },
  { brand: 'lacquer-lab', slug: 'blush-almond-press-ons', name: 'Blush Almond Press-Ons', category: 'nails', img: 'nails-blush-almond', price: 24, profile: 'nails', link: 'blush-almond', featured: true,
    desc: 'Medium almond nails in a sheer blush gloss. Try the other shades live on your hand.', tags: ['nails', 'acrylic nails', 'press-on', 'pink', 'almond', 'gloss'], colors: ['pink', 'nude', 'red'],
    cfg: { nails: { shape: 'almond', length: 1.55, color: '#E9A8B8', finish: 'gloss', tipColor: '#FFFFFF', textureUrl: null } },
    variants: [{ name: 'Blush gloss', hex: '#E9A8B8', ov: { nails: { color: '#E9A8B8', finish: 'gloss' } } }, { name: 'Nude matte', hex: '#D7B29D', ov: { nails: { color: '#D7B29D', finish: 'matte' } } }, { name: 'Rose glitter', hex: '#C9788C', ov: { nails: { color: '#C9788C', finish: 'glitter' } } }, { name: 'Cherry red', hex: '#B3122E', ov: { nails: { color: '#B3122E', finish: 'gloss' } } }] },
  { brand: 'lacquer-lab', slug: 'noir-coffin-set', name: 'Noir Coffin Set', category: 'nails', img: 'nails-noir-coffin', price: 26, profile: 'nails', link: 'noir-coffin',
    desc: 'Long coffin nails in glossy black.', tags: ['nails', 'acrylic nails', 'black', 'coffin', 'long'], colors: ['black'],
    cfg: { nails: { shape: 'coffin', length: 1.9, color: '#16141A', finish: 'gloss', tipColor: '#FFFFFF', textureUrl: null } },
    variants: [{ name: 'Noir', hex: '#16141A', ov: { nails: { color: '#16141A', finish: 'gloss' } } }, { name: 'Oxblood', hex: '#4A0D18', ov: { nails: { color: '#4A0D18', finish: 'gloss' } } }, { name: 'Onyx matte', hex: '#2A2830', ov: { nails: { color: '#2A2830', finish: 'matte' } } }] },
  { brand: 'lacquer-lab', slug: 'chrome-stiletto', name: 'Chrome Stiletto', category: 'nails', img: 'nails-chrome-stiletto', price: 28, profile: 'nails', link: 'chrome-stiletto',
    desc: 'Mirror-chrome stilettos with a lilac tint.', tags: ['nails', 'chrome', 'stiletto', 'silver', 'party'], colors: ['silver', 'purple'],
    cfg: { nails: { shape: 'stiletto', length: 2.0, color: '#D9D4E6', finish: 'chrome', tipColor: '#FFFFFF', textureUrl: null } } },
  { brand: 'lacquer-lab', slug: 'modern-french-square', name: 'Modern French Square', category: 'nails', img: 'nails-french-square', price: 22, profile: 'nails', link: 'modern-french',
    desc: 'Short square nails with a crisp white French tip.', tags: ['nails', 'french', 'square', 'white', 'nude', 'bridal'], colors: ['white', 'nude'],
    cfg: { nails: { shape: 'square', length: 1.3, color: '#F3DCD4', finish: 'french', tipColor: '#FFFFFF', textureUrl: null } } },
  { brand: 'lacquer-lab', slug: 'rosewood-satin-lipstick', name: 'Rosewood Satin Lipstick', category: 'beauty', img: 'lips-rosewood', price: 32, profile: 'face_lips', link: 'rosewood-lips', featured: true,
    desc: 'A satin rosewood that flatters every undertone. Swap shades live.', tags: ['lipstick', 'lips', 'rose', 'satin', 'makeup'], colors: ['pink', 'red', 'nude'],
    cfg: { lips: { color: '#9E3D4C', opacity: 0.58, finish: 'satin' } },
    variants: [{ name: 'Rosewood', hex: '#9E3D4C', ov: { lips: { color: '#9E3D4C' } } }, { name: 'Petal nude', hex: '#C07A6E', ov: { lips: { color: '#C07A6E', opacity: 0.5 } } }, { name: 'Berry', hex: '#6E1F3A', ov: { lips: { color: '#6E1F3A' } } }] },
  { brand: 'lacquer-lab', slug: 'velvet-red-matte', name: 'Velvet Red Matte', category: 'beauty', img: 'lips-velvet-red', price: 32, profile: 'face_lips', link: 'velvet-red',
    desc: 'A true blue-red in a soft-matte finish.', tags: ['lipstick', 'red', 'matte', 'makeup', 'party'], colors: ['red'],
    cfg: { lips: { color: '#B3142B', opacity: 0.62, finish: 'matte' } } },
  { brand: 'nomad-knit', slug: 'merino-rib-beanie', name: 'Merino Rib Beanie', category: 'fashion', model: 'hat-beanie', img: 'hat-beanie', price: 58, profile: 'head_hat', link: 'rib-beanie',
    desc: 'Fine-gauge merino with a folded rib cuff.', tags: ['hat', 'beanie', 'wool', 'winter'], colors: ['pink', 'beige', 'grey'],
    variants: [{ name: 'Mauve', hex: '#9C6F6A', ov: { materials: { knit: { color: '#9C6F6A' } } } }, { name: 'Oat', hex: '#D8C7A8', ov: { materials: { knit: { color: '#D8C7A8' } } } }, { name: 'Charcoal', hex: '#3A3A3E', ov: { materials: { knit: { color: '#3A3A3E' } } } }] },
  { brand: 'nomad-knit', slug: 'canvas-market-tote', name: 'Canvas Market Tote', category: 'accessories', model: 'bag-tote', img: 'bag-tote', price: 85, profile: 'body_bag', link: 'market-tote',
    desc: 'Heavy cotton canvas with leather handles. Body-tracked placement is experimental.', tags: ['bag', 'tote', 'canvas', 'beige'], colors: ['beige', 'brown'] },
  { brand: 'terra-home', slug: 'ceramic-amphora-vase', name: 'Ceramic Amphora Vase', category: 'home', model: 'home-vase', img: 'home-vase', price: 120, profile: 'surface_place', link: 'amphora-vase',
    desc: 'A 26 cm stoneware vase with a satin glaze. Place it in your room.', tags: ['vase', 'ceramic', 'home', 'decor'], colors: ['beige', 'white'] },
];

export interface MockProduct {
  id: string;
  seller_id: string;
  brand_id: string;
  slug: string;
  name: string;
  category_slug: string;
  category_name: string;
  description: string;
  price_cents: number;
  currency: string;
  purchase_url: string | null;
  tags: string[];
  colors: string[];
  images: { url: string; alt?: string }[];
  image: string;
  image2: string | null;
  video_url: string | null;
  status: string;
  is_featured: boolean;
  search_text: string;
  created_at: string;
  brand_name: string;
  brand_slug: string;
  brand_accent: string;
  brand_tagline: string;
  brand_logo: string | null;
  brand_website: string | null;
  link_slug: string;
  tracking_profile: string;
  model_url: string | null;
  config: ARConfig;
  variants: { id: string; name: string; color_hex: string | null; ar_overrides: Record<string, unknown>; size?: string; price_cents?: number }[];
  score: number;
  is_demo: boolean;
}

export const MOCK_PRODUCTS: MockProduct[] = RAW_DEMOS.map((d, i) => {
  const brand = MOCK_BRANDS.find(b => b.slug === d.brand) || MOCK_BRANDS[0];
  const cat = MOCK_CATEGORIES.find(c => c.slug === d.category) || MOCK_CATEGORIES[0];
  const id = `p0000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
  const images = [
    { url: `/seed/img/${d.img}-1.webp`, alt: d.name },
    { url: `/seed/img/${d.img}-2.webp`, alt: `${d.name} — alternate view` },
  ];
  const cfg = buildDefaultConfig(d.profile, {
    ...(d.model ? { size: { mode: 'authored', fitSize: 0.02, fitAxis: 'max', center: false } } : {}),
    ...(d.cfg || {}),
  });
  const variants = (d.variants || []).map((v, vi) => ({
    id: `v0000000-0000-0000-${String(i + 1).padStart(4, '0')}-${String(vi + 1).padStart(8, '0')}`,
    name: v.name,
    color_hex: v.hex,
    ar_overrides: v.ov,
  }));

  return {
    id,
    seller_id: 's0000000-0000-0000-0000-000000000001',
    brand_id: brand.id,
    slug: d.slug,
    name: d.name,
    category_slug: d.category,
    category_name: cat.name,
    description: d.desc,
    price_cents: d.price * 100,
    currency: 'USD',
    purchase_url: null,
    tags: d.tags,
    colors: d.colors,
    images,
    image: `/seed/img/${d.img}-1.webp`,
    image2: `/seed/img/${d.img}-2.webp`,
    video_url: null,
    status: 'active',
    is_featured: !!d.featured,
    search_text: [d.name, brand.name, d.category, ...d.tags, ...d.colors, d.desc].join(' ').toLowerCase(),
    created_at: new Date(Date.now() - (RAW_DEMOS.length - i) * 3600e3 * 7).toISOString(),
    brand_name: brand.name,
    brand_slug: brand.slug,
    brand_accent: brand.accent,
    brand_tagline: brand.tagline,
    brand_logo: brand.logo_url,
    brand_website: brand.website,
    link_slug: d.link,
    tracking_profile: d.profile,
    model_url: d.model ? `/seed/models/${d.model}.glb` : null,
    config: cfg,
    variants,
    score: d.featured ? 15 : 5,
    is_demo: true,
  };
});

// Calculate product counts per category
export function getCategoriesWithCounts() {
  return MOCK_CATEGORIES.map(c => {
    const count = MOCK_PRODUCTS.filter(p => p.category_slug === c.slug).length;
    return { ...c, product_count: count };
  });
}

// Calculate featured brands with covers and counts
export function getFeaturedBrands(limit = 8) {
  return MOCK_BRANDS.slice(0, limit).map(b => {
    const products = MOCK_PRODUCTS.filter(p => p.brand_slug === b.slug);
    return {
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      logo_url: b.logo_url,
      accent: b.accent,
      product_count: products.length,
      cover: products[0]?.image || null,
    };
  });
}

export interface MockAsset {
  id: string;
  kind: 'model' | 'image' | 'video';
  url: string;
  original_filename: string;
  template_name: string;
  bytes: number;
  meta: { triangles: number; materials: string[]; profile: string; warnings: string[] };
  is_template: boolean;
  seller_id: string | null;
  status: 'ready';
}

export const MOCK_ASSETS: MockAsset[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', kind: 'model', url: '/seed/models/ring-solitaire.glb', original_filename: 'ring-solitaire.glb', template_name: 'Solitaire ring', bytes: 52000, meta: { triangles: 1840, materials: ['metal', 'gem'], profile: 'finger_ring', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000002', kind: 'model', url: '/seed/models/ring-eternity.glb', original_filename: 'ring-eternity.glb', template_name: 'Eternity band', bytes: 84000, meta: { triangles: 3200, materials: ['metal', 'gem'], profile: 'finger_ring', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000003', kind: 'model', url: '/seed/models/ring-emerald.glb', original_filename: 'ring-emerald.glb', template_name: 'Emerald-cut ring', bytes: 42000, meta: { triangles: 1200, materials: ['metal', 'gem'], profile: 'finger_ring', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000004', kind: 'model', url: '/seed/models/watch-meridian.glb', original_filename: 'watch-meridian.glb', template_name: 'Classic watch', bytes: 140000, meta: { triangles: 4800, materials: ['case', 'dial', 'strap'], profile: 'wrist_watch', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000005', kind: 'model', url: '/seed/models/watch-noir.glb', original_filename: 'watch-noir.glb', template_name: 'Chronograph watch', bytes: 160000, meta: { triangles: 5600, materials: ['case', 'dial', 'strap'], profile: 'wrist_watch', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000006', kind: 'model', url: '/seed/models/bracelet-tennis.glb', original_filename: 'bracelet-tennis.glb', template_name: 'Tennis bracelet', bytes: 90000, meta: { triangles: 2800, materials: ['metal', 'gem'], profile: 'wrist_bracelet', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000007', kind: 'model', url: '/seed/models/bangle-gold.glb', original_filename: 'bangle-gold.glb', template_name: 'Bangle', bytes: 48000, meta: { triangles: 1600, materials: ['metal'], profile: 'wrist_bracelet', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000008', kind: 'model', url: '/seed/models/glasses-wayfarer.glb', original_filename: 'glasses-wayfarer.glb', template_name: 'Wayfarer frame', bytes: 110000, meta: { triangles: 3400, materials: ['frame', 'lens'], profile: 'face_glasses', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000009', kind: 'model', url: '/seed/models/glasses-round.glb', original_filename: 'glasses-round.glb', template_name: 'Round wire frame', bytes: 78000, meta: { triangles: 2200, materials: ['frame', 'lens'], profile: 'face_glasses', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000010', kind: 'model', url: '/seed/models/glasses-aviator.glb', original_filename: 'glasses-aviator.glb', template_name: 'Aviator frame', bytes: 88000, meta: { triangles: 2600, materials: ['frame', 'lens'], profile: 'face_glasses', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000011', kind: 'model', url: '/seed/models/earring-pearl.glb', original_filename: 'earring-pearl.glb', template_name: 'Pearl drop earring', bytes: 46000, meta: { triangles: 1400, materials: ['pearl', 'metal'], profile: 'face_earrings', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000012', kind: 'model', url: '/seed/models/earring-hoop.glb', original_filename: 'earring-hoop.glb', template_name: 'Hoop earring', bytes: 36000, meta: { triangles: 980, materials: ['metal'], profile: 'face_earrings', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000013', kind: 'model', url: '/seed/models/necklace-halo.glb', original_filename: 'necklace-halo.glb', template_name: 'Pendant necklace', bytes: 82000, meta: { triangles: 2400, materials: ['metal', 'gem'], profile: 'body_necklace', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000014', kind: 'model', url: '/seed/models/hat-beanie.glb', original_filename: 'hat-beanie.glb', template_name: 'Beanie', bytes: 120000, meta: { triangles: 3100, materials: ['knit'], profile: 'head_hat', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000015', kind: 'model', url: '/seed/models/bag-tote.glb', original_filename: 'bag-tote.glb', template_name: 'Tote bag', bytes: 150000, meta: { triangles: 4200, materials: ['canvas', 'leather'], profile: 'body_bag', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
  { id: 'a0000000-0000-0000-0000-000000000016', kind: 'model', url: '/seed/models/home-vase.glb', original_filename: 'home-vase.glb', template_name: 'Vase', bytes: 64000, meta: { triangles: 1800, materials: ['ceramic'], profile: 'surface_place', warnings: [] }, is_template: true, seller_id: null, status: 'ready' },
];

export interface CreatedSkinnerRecord {
  id: string;
  seller_id: string;
  brand_id: string;
  product_id: string;
  name: string;
  tracking_profile: string;
  asset_id: string | null;
  status: 'draft' | 'published' | 'unpublished';
  admin_disabled: boolean;
  disabled_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  link_slug: string | null;
  link_status: string;
  link_expires: string | null;
  p_name: string;
  p_slug: string;
  category_slug: string;
  description: string;
  price_cents: number | null;
  currency: string;
  purchase_url: string | null;
  tags: string[];
  colors: string[];
  images: { url: string; alt?: string }[];
  video_url: string | null;
  product_status: string;
  brand_name: string;
  brand_slug: string;
  brand_accent: string;
  brand_logo: string | null;
  config: ARConfig;
  model_url: string | null;
  variants: { id: string; name: string; color_hex: string | null; ar_overrides: Record<string, unknown> }[];
}

export const USER_CREATED_SKINNERS: Map<string, CreatedSkinnerRecord> = new Map();

export function addCreatedSkinner(record: CreatedSkinnerRecord) {
  USER_CREATED_SKINNERS.set(record.id, record);
}

export function getCreatedSkinner(id: string): CreatedSkinnerRecord | null {
  return USER_CREATED_SKINNERS.get(id) || null;
}

