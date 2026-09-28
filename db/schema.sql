-- SKINIFY database schema (PostgreSQL 14+; tested on Neon and PGlite)
-- Idempotent: safe to re-run via `npm run db:migrate`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'seller' CHECK (role IN ('seller','customer','admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,                 -- sha256(token); raw token only lives in the httpOnly cookie
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'admin' CHECK (level IN ('admin','super')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  website text,
  logo_url text,
  instagram text,
  tiktok text,
  accent text NOT NULL DEFAULT '#6E4CF5',
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brands_seller_idx ON brands(seller_id);

CREATE TABLE IF NOT EXISTS categories (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  default_profile text,
  tint text NOT NULL DEFAULT '#EEE9FF',
  sort int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS tracking_profiles (
  key text PRIMARY KEY,               -- e.g. finger_ring, wrist, nails, face_glasses
  name text NOT NULL,
  tracker text NOT NULL CHECK (tracker IN ('hand','face','pose','surface')),
  body_part text NOT NULL,            -- FACE | HAND | FINGER | WRIST | HEAD | BODY | FEET | OTHER
  anchor text NOT NULL,
  render_mode text NOT NULL DEFAULT 'model' CHECK (render_mode IN ('model','nails','lips','image_plane')),
  maturity text NOT NULL DEFAULT 'stable' CHECK (maturity IN ('stable','beta','experimental')),
  description text NOT NULL DEFAULT '',
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  category_slug text NOT NULL REFERENCES categories(slug),
  description text NOT NULL DEFAULT '',
  price_cents int CHECK (price_cents IS NULL OR price_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  purchase_url text,
  tags text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{url, alt}]
  video_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed','disabled')),
  is_featured boolean NOT NULL DEFAULT false,
  search_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);
CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_slug);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  color_hex text,
  size text,
  price_cents int,
  ar_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {materials:{name:{color,metalness,roughness}}, nails:{...}, lips:{...}}
  sort int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS variants_product_idx ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS ar_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES sellers(id) ON DELETE CASCADE,  -- null = SKINIFY base/template asset
  kind text NOT NULL CHECK (kind IN ('model','image','video','texture')),
  storage_key text NOT NULL,
  url text NOT NULL,
  original_filename text,
  mime text NOT NULL,
  bytes int NOT NULL,
  original_bytes int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,   -- bbox, triangles, materials, textures, warnings
  is_template boolean NOT NULL DEFAULT false,
  template_name text,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','rejected','deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_seller_idx ON ar_assets(seller_id);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents int,                    -- null = contact sales
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text NOT NULL DEFAULT 'month',
  trial_days int NOT NULL DEFAULT 0,
  limits jsonb NOT NULL,
  stripe_price_id text,
  is_public boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  provider text NOT NULL DEFAULT 'none' CHECK (provider IN ('none','manual','stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  expires_at timestamptz,             -- after this moment Skinner links go inactive (assets are kept)
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skinners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  tracking_profile text NOT NULL REFERENCES tracking_profiles(key),
  asset_id uuid REFERENCES ar_assets(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished')),
  admin_disabled boolean NOT NULL DEFAULT false,
  disabled_reason text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS skinners_seller_idx ON skinners(seller_id);
CREATE INDEX IF NOT EXISTS skinners_product_idx ON skinners(product_id);

CREATE TABLE IF NOT EXISTS ar_configurations (
  skinner_id uuid PRIMARY KEY REFERENCES skinners(id) ON DELETE CASCADE,
  anchor text NOT NULL,
  config jsonb NOT NULL,              -- validated by lib/ar/config.ts (zod)
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skinner_id uuid NOT NULL UNIQUE REFERENCES skinners(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,          -- random, non-sequential, reveals nothing internal
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,             -- null = valid while subscription is active
  renewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  seller_id uuid,
  brand_id uuid,
  product_id uuid,
  skinner_id uuid,
  session_id text,
  source text,                        -- link | qr | embed | discover | share | direct
  device text,                        -- mobile | desktop | tablet
  duration_ms int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_seller_time_idx ON analytics_events(seller_id, created_at);
CREATE INDEX IF NOT EXISTS events_skinner_idx ON analytics_events(skinner_id, event);
CREATE INDEX IF NOT EXISTS events_time_idx ON analytics_events(created_at);

CREATE TABLE IF NOT EXISTS shares (
  id bigserial PRIMARY KEY,
  skinner_id uuid,
  product_id uuid,
  kind text NOT NULL CHECK (kind IN ('link','snap_photo','snap_video','qr')),
  channel text NOT NULL DEFAULT 'native',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id bigserial PRIMARY KEY,
  skinner_id uuid REFERENCES skinners(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- A Skinner is "live" (customers can open it) only when every commercial and moderation rule passes.
CREATE OR REPLACE VIEW live_skinners AS
SELECT s.id AS skinner_id, s.product_id, s.seller_id, s.brand_id, l.slug AS link_slug
FROM skinners s
JOIN public_links l ON l.skinner_id = s.id
JOIN products p ON p.id = s.product_id
JOIN brands b ON b.id = s.brand_id
JOIN sellers se ON se.id = s.seller_id
JOIN subscriptions sub ON sub.seller_id = s.seller_id
WHERE s.status = 'published' AND NOT s.admin_disabled
  AND l.status = 'active' AND (l.expires_at IS NULL OR l.expires_at > now())
  AND sub.status IN ('trialing','active','past_due') AND (sub.expires_at IS NULL OR sub.expires_at > now())
  AND p.status = 'active' AND b.status = 'active' AND se.status = 'active';
