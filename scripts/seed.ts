/**
 * Seeds reference data (categories, tracking profiles, plans, SKINIFY base models) and an optional
 * clearly-labelled DEMO catalogue. Idempotent. No analytics events are fabricated.
 *
 *   DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
 *   SEED_DEMO=false to skip the demo catalogue.
 */
import postgres from 'postgres';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { scryptSync, randomBytes } from 'crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { TRACKING_PROFILES, buildDefaultConfig, ARConfig } from '../lib/ar/config';

const url = process.env.DATABASE_URL; if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(url);
const sql = postgres(url, { max: 1, ssl: local ? false : 'require', prepare: false, onnotice: () => {} });

function hash(pw: string) { const salt = randomBytes(16); const k = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }); return `scrypt$${salt.toString('base64')}$${k.toString('base64')}`; }

const CATEGORIES = [
  { slug: 'jewellery', name: 'Jewellery', description: 'Rings, earrings, necklaces and bracelets', default_profile: 'finger_ring', tint: '#F3E9DD', sort: 1 },
  { slug: 'nails', name: 'Nails', description: 'Press-ons and nail designs', default_profile: 'nails', tint: '#F8E1E7', sort: 2 },
  { slug: 'watches', name: 'Watches', description: 'Wrist-tracked timepieces', default_profile: 'wrist_watch', tint: '#E6E9EE', sort: 3 },
  { slug: 'eyewear', name: 'Eyewear', description: 'Sunglasses and optical frames', default_profile: 'face_glasses', tint: '#E9E4F7', sort: 4 },
  { slug: 'beauty', name: 'Beauty', description: 'Lip colour and beauty accessories', default_profile: 'face_lips', tint: '#F6DDE0', sort: 5 },
  { slug: 'fashion', name: 'Fashion', description: 'Headwear and garments', default_profile: 'head_hat', tint: '#EEE6E1', sort: 6 },
  { slug: 'accessories', name: 'Accessories', description: 'Bags and everyday accessories', default_profile: 'body_bag', tint: '#ECE7DC', sort: 7 },
  { slug: 'footwear', name: 'Footwear', description: 'Shoes and sneakers', default_profile: 'feet_shoes', tint: '#E3E8E4', sort: 8 },
  { slug: 'home', name: 'Home', description: 'Objects you can place in your room', default_profile: 'surface_place', tint: '#EFE8DF', sort: 9 },
  { slug: 'more', name: 'More', description: 'Everything else', default_profile: 'surface_place', tint: '#ECECEC', sort: 10 },
];

const L = (o: Partial<Record<string, unknown>>) => o;
const PLANS = [
  { id: 'trial', name: 'Trial', description: 'Try SKINIFY free for 14 days.', price_cents: 0, trial_days: 14, is_default: true, sort: 1,
    limits: L({ max_active_skinners: 2, max_skinners: 5, link_validity_days: null, monthly_ar_sessions: 500, storage_mb: 100, max_upload_mb: 15, analytics: 'basic', remove_branding: false, embed: true, api_access: false, qr: true }) },
  { id: 'starter', name: 'Starter', description: 'For independent makers launching their first Skinners.', price_cents: 1900, trial_days: 0, is_default: false, sort: 2,
    limits: L({ max_active_skinners: 10, max_skinners: 25, link_validity_days: 90, monthly_ar_sessions: 5000, storage_mb: 1024, max_upload_mb: 25, analytics: 'basic', remove_branding: false, embed: true, api_access: false, qr: true }) },
  { id: 'pro', name: 'Pro', description: 'For growing brands selling across channels.', price_cents: 5900, trial_days: 0, is_default: false, sort: 3,
    limits: L({ max_active_skinners: 50, max_skinners: 150, link_validity_days: 365, monthly_ar_sessions: 25000, storage_mb: 5120, max_upload_mb: 50, analytics: 'advanced', remove_branding: true, embed: true, api_access: false, qr: true }) },
  { id: 'business', name: 'Business', description: 'High-volume catalogues, API access and white-label AR.', price_cents: 19900, trial_days: 0, is_default: false, sort: 4,
    limits: L({ max_active_skinners: 250, max_skinners: 1000, link_validity_days: null, monthly_ar_sessions: 150000, storage_mb: 25600, max_upload_mb: 100, analytics: 'advanced', remove_branding: true, embed: true, api_access: true, qr: true }) },
  { id: 'enterprise', name: 'Enterprise', description: 'Custom limits, SLAs and dedicated onboarding.', price_cents: null, trial_days: 0, is_default: false, sort: 5,
    limits: L({ max_active_skinners: null, max_skinners: null, link_validity_days: null, monthly_ar_sessions: null, storage_mb: 512000, max_upload_mb: 200, analytics: 'advanced', remove_branding: true, embed: true, api_access: true, qr: true }) },
];

// SKINIFY base models (also offered to sellers as templates). Authored in metres, origin = anchor.
const MODELS: Record<string, { name: string; profile: string }> = {
  'ring-solitaire': { name: 'Solitaire ring', profile: 'finger_ring' }, 'ring-eternity': { name: 'Eternity band', profile: 'finger_ring' }, 'ring-emerald': { name: 'Emerald-cut ring', profile: 'finger_ring' },
  'watch-meridian': { name: 'Classic watch', profile: 'wrist_watch' }, 'watch-noir': { name: 'Chronograph watch', profile: 'wrist_watch' },
  'bracelet-tennis': { name: 'Tennis bracelet', profile: 'wrist_bracelet' }, 'bangle-gold': { name: 'Bangle', profile: 'wrist_bracelet' },
  'glasses-wayfarer': { name: 'Wayfarer frame', profile: 'face_glasses' }, 'glasses-round': { name: 'Round wire frame', profile: 'face_glasses' }, 'glasses-aviator': { name: 'Aviator frame', profile: 'face_glasses' },
  'earring-pearl': { name: 'Pearl drop earring', profile: 'face_earrings' }, 'earring-hoop': { name: 'Hoop earring', profile: 'face_earrings' },
  'necklace-halo': { name: 'Pendant necklace', profile: 'body_necklace' }, 'hat-beanie': { name: 'Beanie', profile: 'head_hat' },
  'bag-tote': { name: 'Tote bag', profile: 'body_bag' }, 'home-vase': { name: 'Vase', profile: 'surface_place' },
};

async function optimiseModels() {
  await MeshoptEncoder.ready; await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  mkdirSync('public/seed/models', { recursive: true });
  const out: Record<string, { url: string; bytes: number; original: number; tris: number; materials: string[] }> = {};
  for (const id of Object.keys(MODELS)) {
    const dst = `public/seed/models/${id}.glb`;
    const src = `seed-src/models/${id}.glb`;
    const input = readFileSync(existsSync(src) ? src : dst);
    const doc = await io.readBinary(input);
    let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION')!.getCount()) / 3; }
    const materials = doc.getRoot().listMaterials().map(m => m.getName()).filter(Boolean);
    let bytes = input.length;
    if (existsSync(src)) { await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' })); const o = await io.writeBinary(doc); writeFileSync(dst, o); bytes = o.length; }
    out[id] = { url: `/seed/models/${id}.glb`, bytes, original: input.length, tris: Math.round(tris), materials: [...new Set(materials)] };
  }
  return out;
}

type Demo = { brand: string; slug: string; name: string; category: string; model?: string; img: string; price: number; profile: string; link: string; desc: string; tags: string[]; colors: string[]; featured?: boolean;
  cfg?: Partial<ARConfig>; variants?: { name: string; hex: string; ov: Record<string, unknown> }[] };

const BRANDS = [
  { slug: 'aurelle', name: 'Aurelle Fine Jewellery', tagline: 'Heirloom pieces, made to be tried.', accent: '#B8893B', description: 'Recycled gold and ethically sourced stones, hand-finished in small batches.', website: null },
  { slug: 'meridian', name: 'Meridian Watch Co.', tagline: 'Quiet design for everyday wrists.', accent: '#2E3A4B', description: 'Minimal mechanical watches with interchangeable straps.', website: null },
  { slug: 'optika', name: 'Optika Studio', tagline: 'Frames with a point of view.', accent: '#1E1E24', description: 'Acetate and titanium eyewear designed for every face.', website: null },
  { slug: 'lacquer-lab', name: 'Lacquer Lab', tagline: 'Salon nails, no appointment.', accent: '#D0668A', description: 'Reusable press-on nails and long-wear lip colour.', website: null },
  { slug: 'nomad-knit', name: 'Nomad Knit', tagline: 'Soft goods for slow travel.', accent: '#8C6A5D', description: 'Merino knitwear and canvas carry goods.', website: null },
  { slug: 'terra-home', name: 'Terra Home', tagline: 'Objects with patience.', accent: '#9A7B5F', description: 'Hand-thrown ceramics for calm rooms.', website: null },
];

const metal = (hex: string) => ({ materials: { metal: { color: hex } } });
const DEMOS: Demo[] = [
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

async function main() {
  await sql.unsafe(readFileSync('db/schema.sql', 'utf8'));
  for (const c of CATEGORIES) await sql`insert into categories ${sql(c)} on conflict (slug) do update set name = excluded.name, description = excluded.description, default_profile = excluded.default_profile, tint = excluded.tint, sort = excluded.sort`;
  for (const p of TRACKING_PROFILES) {
    const row = { key: p.key, name: p.name, tracker: p.tracker, body_part: p.bodyPart, anchor: p.anchor, render_mode: p.renderMode, maturity: p.maturity, description: p.description, default_config: sql.json(buildDefaultConfig(p.key) as never) };
    await sql`insert into tracking_profiles ${sql(row)} on conflict (key) do update set name = excluded.name, tracker = excluded.tracker, body_part = excluded.body_part, anchor = excluded.anchor, render_mode = excluded.render_mode, maturity = excluded.maturity, description = excluded.description, default_config = excluded.default_config`;
  }
  for (const p of PLANS) {
    await sql`insert into subscription_plans (id, name, description, price_cents, trial_days, is_default, sort, limits) values (${p.id}, ${p.name}, ${p.description}, ${p.price_cents}, ${p.trial_days}, ${p.is_default}, ${p.sort}, ${sql.json(p.limits as never)})
      on conflict (id) do nothing`;
  }
  const models = await optimiseModels();
  const assetIds: Record<string, string> = {};
  for (const [id, m] of Object.entries(models)) {
    const [ex] = await sql`select id from ar_assets where storage_key = ${'seed/' + id} and is_template`;
    const meta = sql.json({ triangles: m.tris, materials: m.materials, optimized: true, source: 'SKINIFY base model (procedurally authored)', profile: MODELS[id].profile } as never);
    if (ex) { await sql`update ar_assets set url = ${m.url}, bytes = ${m.bytes}, original_bytes = ${m.original}, meta = ${meta} where id = ${ex.id}`; assetIds[id] = ex.id; }
    else { const [r] = await sql`insert into ar_assets (seller_id, kind, storage_key, url, original_filename, mime, bytes, original_bytes, meta, is_template, template_name) values (null, 'model', ${'seed/' + id}, ${m.url}, ${id + '.glb'}, 'model/gltf-binary', ${m.bytes}, ${m.original}, ${meta}, true, ${MODELS[id].name}) returning id`; assetIds[id] = r.id; }
    console.log(`  model ${id}: ${(m.original / 1024).toFixed(0)} KB → ${(m.bytes / 1024).toFixed(0)} KB, ${m.tris} tris`);
  }

  // admin
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const [u] = await sql`insert into users (email, password_hash, name, role) values (${email}, ${hash(process.env.ADMIN_PASSWORD)}, 'SKINIFY Admin', 'admin')
      on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin' returning id`;
    await sql`insert into admin_users (user_id, level) values (${u.id}, 'super') on conflict do nothing`;
    console.log('  admin:', email);
  }

  if (process.env.SEED_DEMO === 'false') { await sql.end(); return; }
  // demo seller (clearly flagged is_demo)
  const demoEmail = (process.env.DEMO_SELLER_EMAIL || 'demo@skinify.app').toLowerCase();
  const demoPw = process.env.DEMO_SELLER_PASSWORD || randomBytes(9).toString('base64url');
  const [du] = await sql`insert into users (email, password_hash, name, role) values (${demoEmail}, ${hash(demoPw)}, 'Demo Seller', 'seller')
    on conflict (email) do update set password_hash = case when ${!!process.env.DEMO_SELLER_PASSWORD} then excluded.password_hash else users.password_hash end returning id, (xmax = 0) as inserted`;
  const [seller] = await sql`insert into sellers (user_id, is_demo) values (${du.id}, true) on conflict (user_id) do update set is_demo = true returning id`;
  await sql`insert into subscriptions (seller_id, plan_id, status, provider, current_period_end, expires_at) values (${seller.id}, 'business', 'active', 'manual', null, null)
    on conflict (seller_id) do nothing`;
  if (du.inserted || process.env.DEMO_SELLER_PASSWORD) console.log(`  demo seller: ${demoEmail} / ${demoPw}`);
  const brandIds: Record<string, string> = {};
  for (const [i, b] of BRANDS.entries()) {
    const [r] = await sql`insert into brands (seller_id, slug, name, tagline, description, website, accent, is_featured) values (${seller.id}, ${b.slug}, ${b.name}, ${b.tagline}, ${b.description}, ${b.website}, ${b.accent}, ${i < 4})
      on conflict (slug) do update set name = excluded.name, tagline = excluded.tagline, description = excluded.description, accent = excluded.accent returning id`;
    brandIds[b.slug] = r.id;
  }
  for (const [i, d] of DEMOS.entries()) {
    const brand = BRANDS.find(b => b.slug === d.brand)!;
    const images = [{ url: `/seed/img/${d.img}-1.webp`, alt: d.name }, ...(existsSync(`public/seed/img/${d.img}-2.webp`) ? [{ url: `/seed/img/${d.img}-2.webp`, alt: d.name + ' — alternate view' }] : [])];
    const search = [d.name, brand.name, d.category, ...d.tags, ...d.colors, d.desc].join(' ').toLowerCase();
    const created = new Date(Date.now() - (DEMOS.length - i) * 3600e3 * 7);
    const [p] = await sql`insert into products (seller_id, brand_id, slug, name, category_slug, description, price_cents, currency, purchase_url, tags, colors, images, is_featured, search_text, created_at)
      values (${seller.id}, ${brandIds[d.brand]}, ${d.slug}, ${d.name}, ${d.category}, ${d.desc}, ${d.price * 100}, 'USD', null, ${d.tags}, ${d.colors}, ${sql.json(images as never)}, ${!!d.featured}, ${search}, ${created})
      on conflict (brand_id, slug) do update set name = excluded.name, description = excluded.description, price_cents = excluded.price_cents, tags = excluded.tags, colors = excluded.colors, images = excluded.images, is_featured = excluded.is_featured, search_text = excluded.search_text, category_slug = excluded.category_slug
      returning id`;
    await sql`delete from product_variants where product_id = ${p.id}`;
    for (const [k, v] of (d.variants || []).entries()) await sql`insert into product_variants (product_id, name, color_hex, ar_overrides, sort) values (${p.id}, ${v.name}, ${v.hex}, ${sql.json(v.ov as never)}, ${k})`;
    const cfg = buildDefaultConfig(d.profile, { ...(d.model ? { size: { mode: 'authored', fitSize: 0.02, fitAxis: 'max', center: false } } : {}), ...(d.cfg || {}) });
    const assetId = d.model ? assetIds[d.model] : null;
    let [s] = await sql`select id from skinners where product_id = ${p.id}`;
    if (!s) [s] = await sql`insert into skinners (seller_id, brand_id, product_id, name, tracking_profile, asset_id, status, published_at, created_at) values (${seller.id}, ${brandIds[d.brand]}, ${p.id}, ${d.name}, ${d.profile}, ${assetId}, 'published', now(), ${created}) returning id`;
    else await sql`update skinners set tracking_profile = ${d.profile}, asset_id = ${assetId}, name = ${d.name}, status = 'published' where id = ${s.id}`;
    await sql`insert into ar_configurations (skinner_id, anchor, config) values (${s.id}, ${cfg.anchor}, ${sql.json(cfg as never)}) on conflict (skinner_id) do update set anchor = excluded.anchor, config = excluded.config, updated_at = now()`;
    await sql`insert into public_links (skinner_id, slug, status, expires_at) values (${s.id}, ${d.link}, 'active', null) on conflict (skinner_id) do update set slug = excluded.slug, status = 'active'`;
  }
  console.log(`  demo catalogue: ${BRANDS.length} brands, ${DEMOS.length} products (flagged is_demo, no purchase URLs, no analytics)`);
  await sql.end();
}
main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
