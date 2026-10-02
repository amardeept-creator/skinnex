import 'server-only';
import postgres from 'postgres';
import {
  MOCK_CATEGORIES,
  MOCK_BRANDS,
  MOCK_PLANS,
  MOCK_PRODUCTS,
  MOCK_ASSETS,
  USER_CREATED_SKINNERS,
  addCreatedSkinner,
  getCreatedSkinner,
  getCategoriesWithCounts,
  getFeaturedBrands,
  type MockProduct,
} from './mock-db';
import { TRACKING_PROFILES, PROFILE_BY_KEY, buildDefaultConfig, type ARConfig } from '@/lib/ar/config';

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __skinifySql: Sql | undefined;
}

interface SqlFragment {
  __isSqlFragment: true;
  strings: string[];
  values: unknown[];
  then<TResult1 = unknown[], TResult2 = never>(
    onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<unknown[] | TResult>;
  finally(onfinally?: (() => void) | null): Promise<unknown[]>;
}

function isSqlFragment(val: unknown): val is SqlFragment {
  return typeof val === 'object' && val !== null && '__isSqlFragment' in val;
}

function flattenFragment(strings: TemplateStringsArray | string[], values: unknown[]): { text: string; args: unknown[] } {
  let text = '';
  const args: unknown[] = [];

  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      const val = values[i];
      if (isSqlFragment(val)) {
        const sub = flattenFragment(val.strings, val.values);
        text += sub.text;
        args.push(...sub.args);
      } else {
        text += ` $${args.length + 1} `;
        args.push(val);
      }
    }
  }

  return { text, args };
}

function createQueryResult(rows: unknown[]): unknown[] & { count: number; columns: unknown[] } {
  const arr = [...rows] as unknown[] & { count: number; columns: unknown[] };
  arr.count = rows.length;
  arr.columns = [];
  return arr;
}

function executeMockQuery(text: string, args: unknown[]): unknown[] {
  const norm = text.toLowerCase().replace(/\s+/g, ' ');

  // 1. Categories
  if (norm.includes('from categories')) {
    const list = getCategoriesWithCounts();
    return createQueryResult(list);
  }

  // 2. Subscription plans
  if (norm.includes('from subscription_plans')) {
    return createQueryResult(MOCK_PLANS);
  }

  // 3. Tracking profiles
  if (norm.includes('from tracking_profiles')) {
    return createQueryResult(TRACKING_PROFILES);
  }

  // 4. Featured brands / brand listings / brand page
  if (norm.includes('from brands')) {
    if (norm.includes('select b.slug, b.name, b.tagline') || norm.includes('distinct l.product_id')) {
      const limit = Number(args[args.length - 1]) || 8;
      return createQueryResult(getFeaturedBrands(limit));
    }
    if (norm.includes('b.slug =') || norm.includes('where b.slug =')) {
      // Find the slug in args
      const slug = args.find(a => typeof a === 'string' && MOCK_BRANDS.some(b => b.slug === a)) as string | undefined;
      const brand = MOCK_BRANDS.find(b => b.slug === slug) || MOCK_BRANDS[0];
      return createQueryResult(brand ? [brand] : []);
    }
    if (norm.includes('select slug, name from brands')) {
      return createQueryResult(MOCK_BRANDS.map(b => ({ slug: b.slug, name: b.name })));
    }
    return createQueryResult(MOCK_BRANDS);
  }

  // 5. Product Page: getProductPage (b.slug = $... and p.slug = $...)
  if (norm.includes('from products') && norm.includes('where b.slug =') && norm.includes('p.slug =')) {
    const brandSlug = args.find(a => typeof a === 'string' && MOCK_BRANDS.some(b => b.slug === a)) as string | undefined;
    const productSlug = args.find(a => typeof a === 'string' && MOCK_PRODUCTS.some(p => p.slug === a)) as string | undefined;
    const p = MOCK_PRODUCTS.find(x => (!brandSlug || x.brand_slug === brandSlug) && (!productSlug || x.slug === productSlug));
    if (p) {
      return createQueryResult([{
        id: p.id,
        seller_id: p.seller_id,
        brand_id: p.brand_id,
        slug: p.slug,
        name: p.name,
        category_slug: p.category_slug,
        description: p.description,
        price_cents: p.price_cents,
        currency: p.currency,
        purchase_url: p.purchase_url,
        tags: p.tags,
        colors: p.colors,
        images: p.images,
        video_url: p.video_url,
        status: p.status,
        is_featured: p.is_featured,
        search_text: p.search_text,
        created_at: p.created_at,
        category_name: p.category_name,
        brand_name: p.brand_name,
        brand_slug: p.brand_slug,
        brand_logo: p.brand_logo,
        brand_website: p.brand_website,
        brand_accent: p.brand_accent,
        brand_tagline: p.brand_tagline,
        is_demo: p.is_demo,
        link_slug: p.link_slug,
        tracking_profile: p.tracking_profile,
        model_url: p.model_url,
        config: p.config,
        variants: p.variants,
      }]);
    }
    return createQueryResult([]);
  }

  // 6. Public Skinner link: resolvePublicSkinner (where l.slug = $...)
  if (norm.includes('from public_links') || norm.includes('public_links l')) {
    if (norm.includes('l.slug =')) {
      const slugArg = args.find(a => typeof a === 'string' && MOCK_PRODUCTS.some(p => p.link_slug === a)) as string | undefined;
      const p = MOCK_PRODUCTS.find(x => x.link_slug === slugArg) || (slugArg ? null : MOCK_PRODUCTS[0]);
      if (p) {
        return createQueryResult([{
          slug: p.link_slug,
          link_status: 'active',
          link_expires: null,
          skinner_id: 'sk_' + p.id,
          name: p.name,
          status: 'published',
          admin_disabled: false,
          tracking_profile: p.tracking_profile,
          seller_id: p.seller_id,
          brand_id: p.brand_id,
          product_id: p.id,
          config: p.config,
          model_url: p.model_url,
          p_name: p.name,
          p_slug: p.slug,
          description: p.description,
          price_cents: p.price_cents,
          currency: p.currency,
          purchase_url: p.purchase_url,
          images: p.images,
          category_slug: p.category_slug,
          p_status: 'active',
          b_name: p.brand_name,
          b_slug: p.brand_slug,
          logo_url: p.brand_logo,
          accent: p.brand_accent,
          website: p.brand_website,
          b_status: 'active',
          se_status: 'active',
          is_demo: true,
          sub_status: 'active',
          sub_expires: null,
          limits: MOCK_PLANS.find(pl => pl.id === 'business')?.limits,
        }]);
      }
      return createQueryResult([]);
    }
  }

  // 7. Product Variants (where product_id = $...)
  if (norm.includes('from product_variants')) {
    const pId = args.find(a => typeof a === 'string' && MOCK_PRODUCTS.some(p => p.id === a)) as string | undefined;
    const p = MOCK_PRODUCTS.find(x => x.id === pId);
    if (p) {
      return createQueryResult(p.variants);
    }
    return createQueryResult(MOCK_PRODUCTS[0].variants);
  }

  // 8. General Products List (listProducts)
  if (norm.includes('from products') || norm.includes('from live_skinners')) {
    let items: MockProduct[] = [...MOCK_PRODUCTS];

    // Check for category filter in args
    const catArg = args.find(a => typeof a === 'string' && MOCK_CATEGORIES.some(c => c.slug === a));
    if (catArg) {
      items = items.filter(p => p.category_slug === catArg);
    }

    // Check for brand filter in args
    const brandArg = args.find(a => typeof a === 'string' && MOCK_BRANDS.some(b => b.slug === a));
    if (brandArg) {
      items = items.filter(p => p.brand_slug === brandArg);
    }

    // Check for search term in args
    const searchArg = args.find(a => typeof a === 'string' && a.startsWith('%') && a.endsWith('%'));
    if (searchArg) {
      const q = (searchArg as string).slice(1, -1).toLowerCase();
      items = items.filter(p => p.search_text.includes(q));
    }

    const total = items.length;
    // Map to CardProduct format expected by listProducts
    const mapped = items.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price_cents: p.price_cents,
      currency: p.currency,
      category_slug: p.category_slug,
      category_name: p.category_name,
      image: p.image,
      image2: p.image2,
      brand_name: p.brand_name,
      brand_slug: p.brand_slug,
      link_slug: p.link_slug,
      tracking_profile: p.tracking_profile,
      colors: p.colors,
      created_at: p.created_at,
      score: p.score,
      total,
    }));

    return createQueryResult(mapped);
  }

  // 9. Entitlements and Subscriptions
  if (norm.includes('from subscriptions')) {
    const plan = MOCK_PLANS.find(p => p.id === 'business') || MOCK_PLANS[0];
    return createQueryResult([{
      id: 'sub_mock_001',
      seller_id: 's0000000-0000-0000-0000-000000000001',
      plan_id: plan.id,
      status: 'active',
      provider: 'manual',
      started_at: new Date(),
      current_period_start: new Date(),
      current_period_end: null,
      expires_at: null,
      cancel_at_period_end: false,
      plan,
    }]);
  }

  // 10. Analytics Events Summary
  if (norm.includes('from analytics_events')) {
    if (norm.includes('count') || norm.includes('total_skinners') || norm.includes('as n')) {
      return createQueryResult([{
        n: 0,
        count: 0,
        product_views: 0,
        link_clicks: 0,
        launches: 0,
        ar_sessions: 0,
        tracked: 0,
        tryons: 0,
        captures: 0,
        shares: 0,
        buy_clicks: 0,
        camera_denied: 0,
        avg_session_ms: 0,
        total_skinners: MOCK_PRODUCTS.length,
        active_skinners: MOCK_PRODUCTS.length,
        storage_bytes: 0,
        ar_sessions_month: 0,
      }]);
    }
    return createQueryResult([]);
  }

  // 11. AR Assets
  if (norm.includes('from ar_assets')) {
    if (norm.includes('where id =') || norm.includes('a.id =')) {
      const idArg = args.find(a => typeof a === 'string' && MOCK_ASSETS.some((x: { id: string }) => x.id === a)) as string | undefined;
      const found = MOCK_ASSETS.find((x: { id: string }) => x.id === idArg) || MOCK_ASSETS[0];
      return createQueryResult(found ? [found] : []);
    }
    if (norm.includes('url = any')) {
      return createQueryResult(MOCK_ASSETS.map((a: { url: string }) => ({ url: a.url })));
    }
    return createQueryResult(MOCK_ASSETS);
  }

  // 12. Skinners
  if (norm.includes('from skinners')) {
    if (norm.includes('where s.id =') || norm.includes('s.id =')) {
      const idArg = args.find(a => typeof a === 'string' && (a.startsWith('sk_') || /^[0-9a-f-]{36}$/.test(a))) as string | undefined;
      const created = idArg ? getCreatedSkinner(idArg) : null;
      if (created) {
        return createQueryResult([created]);
      }
      const prod = MOCK_PRODUCTS.find(p => 'sk_' + p.id === idArg || p.id === idArg) || MOCK_PRODUCTS[0];
      return createQueryResult([{
        id: idArg || prod.id,
        seller_id: prod.seller_id,
        brand_id: prod.brand_id,
        product_id: prod.id,
        name: prod.name,
        tracking_profile: prod.tracking_profile,
        asset_id: MOCK_ASSETS[0].id,
        status: 'published',
        admin_disabled: false,
        disabled_reason: null,
        published_at: prod.created_at,
        created_at: prod.created_at,
        updated_at: prod.created_at,
        slug: prod.link_slug,
        link_slug: prod.link_slug,
        link_expires: null,
        image: prod.image,
        p_name: prod.name,
        p_slug: prod.slug,
        description: prod.description,
        price_cents: prod.price_cents,
        currency: prod.currency,
        purchase_url: prod.purchase_url,
        images: prod.images,
        category_slug: prod.category_slug,
        brand_name: prod.brand_name,
        brand_slug: prod.brand_slug,
        brand_logo: prod.brand_logo,
        brand_accent: prod.brand_accent,
        config: prod.config,
        model_url: prod.model_url,
        variants: prod.variants,
        tryons: 0,
        views: 0,
        shares: 0,
      }]);
    }

    const createdList = Array.from(USER_CREATED_SKINNERS.values()).map(c => ({
      ...c,
      image: c.images[0]?.url || '/seed/img/ring-solitaire-1.webp',
      slug: c.link_slug,
      tryons: 0,
      views: 0,
      shares: 0,
    }));

    const mockList = MOCK_PRODUCTS.map(p => ({
      id: p.id,
      seller_id: p.seller_id,
      brand_id: p.brand_id,
      product_id: p.id,
      name: p.name,
      tracking_profile: p.tracking_profile,
      asset_id: null,
      status: 'published',
      admin_disabled: false,
      disabled_reason: null,
      published_at: p.created_at,
      created_at: p.created_at,
      updated_at: p.created_at,
      slug: p.link_slug,
      link_slug: p.link_slug,
      link_expires: null,
      image: p.image,
      p_name: p.name,
      p_slug: p.slug,
      description: p.description,
      price_cents: p.price_cents,
      currency: p.currency,
      purchase_url: p.purchase_url,
      images: p.images,
      category_slug: p.category_slug,
      brand_name: p.brand_name,
      brand_slug: p.brand_slug,
      brand_logo: p.brand_logo,
      brand_accent: p.brand_accent,
      config: p.config,
      model_url: p.model_url,
      variants: p.variants,
      tryons: 0,
      views: 0,
      shares: 0,
    }));
    return createQueryResult([...createdList, ...mockList]);
  }

  // 13. Mutations: Insert into products
  if (norm.includes('insert into products')) {
    const pid = crypto.randomUUID();
    const nameArg = args.find((a, i) => i >= 3 && typeof a === 'string' && a.length > 0) as string | undefined;
    const catArg = args.find(a => typeof a === 'string' && MOCK_CATEGORIES.some(c => c.slug === a)) as string | undefined;
    const priceArg = args.find(a => typeof a === 'number') as number | undefined;
    const descArg = args.find((a, i) => i >= 4 && typeof a === 'string' && a.length > 5 && a !== nameArg) as string | undefined;
    const imagesArg = args.find(a => Array.isArray(a) && a.length > 0 && typeof a[0] === 'object' && a[0] !== null && 'url' in a[0]) as { url: string; alt?: string }[] | undefined;

    (globalThis as unknown as { __lastInsertedProduct?: unknown }).__lastInsertedProduct = {
      id: pid,
      name: nameArg || 'Custom Product',
      category: catArg || 'jewellery',
      description: descArg || '',
      price_cents: priceArg ?? null,
      images: imagesArg || [{ url: '/seed/img/ring-solitaire-1.webp' }],
    };

    return createQueryResult([{ id: pid }]);
  }

  // 14. Mutations: Insert into product_variants
  if (norm.includes('insert into product_variants')) {
    return createQueryResult([{ id: crypto.randomUUID() }]);
  }

  // 15. Mutations: Insert into skinners
  if (norm.includes('insert into skinners')) {
    const sid = crypto.randomUUID();
    const lastProd = (globalThis as unknown as { __lastInsertedProduct?: { id: string; name: string; category: string; description: string; price_cents: number | null; images: { url: string; alt?: string }[] } }).__lastInsertedProduct;
    const nameArg = (args.find((a, i) => i >= 2 && typeof a === 'string' && a.length > 0) as string) || lastProd?.name || 'Custom Skinner';
    const profileArg = (args.find(a => typeof a === 'string' && a in PROFILE_BY_KEY) as string) || 'finger_ring';
    const assetIdArg = (args.find(a => typeof a === 'string' && MOCK_ASSETS.some((x: { id: string }) => x.id === a)) as string | null) || null;
    const asset = MOCK_ASSETS.find(a => a.id === assetIdArg);
    const brandIdArg = (args.find(a => typeof a === 'string' && MOCK_BRANDS.some(b => b.id === a)) as string) || MOCK_BRANDS[0].id;
    const brand = MOCK_BRANDS.find(b => b.id === brandIdArg) || MOCK_BRANDS[0];

    const newRecord = {
      id: sid,
      seller_id: 's0000000-0000-0000-0000-000000000001',
      brand_id: brand.id,
      product_id: lastProd?.id || crypto.randomUUID(),
      name: nameArg,
      tracking_profile: profileArg,
      asset_id: assetIdArg,
      status: 'draft' as const,
      admin_disabled: false,
      disabled_reason: null,
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      link_slug: null,
      link_status: 'inactive',
      link_expires: null,
      p_name: nameArg,
      p_slug: nameArg.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category_slug: lastProd?.category || 'jewellery',
      description: lastProd?.description || '',
      price_cents: lastProd?.price_cents ?? null,
      currency: 'USD',
      purchase_url: null,
      tags: [],
      colors: [],
      images: lastProd?.images || [{ url: '/seed/img/ring-solitaire-1.webp' }],
      video_url: null,
      product_status: 'active',
      brand_name: brand.name,
      brand_slug: brand.slug,
      brand_accent: brand.accent,
      brand_logo: brand.logo_url,
      config: buildDefaultConfig(profileArg),
      model_url: asset?.url || null,
      variants: [],
    };

    addCreatedSkinner(newRecord);
    (globalThis as unknown as { __lastCreatedSkinnerId?: string }).__lastCreatedSkinnerId = sid;

    return createQueryResult([{ id: sid }]);
  }

  // 16. Mutations: Insert into ar_configurations
  if (norm.includes('insert into ar_configurations')) {
    const configArg = args.find(a => typeof a === 'object' && a !== null && 'anchor' in a) as Record<string, unknown> | undefined;
    const sidArg = (args.find(a => typeof a === 'string' && USER_CREATED_SKINNERS.has(a)) as string) || (globalThis as unknown as { __lastCreatedSkinnerId?: string }).__lastCreatedSkinnerId;
    if (sidArg && configArg) {
      const rec = USER_CREATED_SKINNERS.get(sidArg);
      if (rec) {
        rec.config = configArg as unknown as ARConfig;
      }
    }
    return createQueryResult([{ id: crypto.randomUUID() }]);
  }

  // 17. Mutations: Insert into public_links
  if (norm.includes('insert into public_links')) {
    const sidArg = args.find(a => typeof a === 'string' && (/^[0-9a-f-]{36}$/.test(a) || a.startsWith('sk_') || USER_CREATED_SKINNERS.has(a))) as string | undefined;
    const slugArg = args.find(a => typeof a === 'string' && a !== sidArg && !a.startsWith('active')) as string | undefined;
    const targetSid = sidArg || (globalThis as unknown as { __lastCreatedSkinnerId?: string }).__lastCreatedSkinnerId;
    if (targetSid && slugArg) {
      const rec = USER_CREATED_SKINNERS.get(targetSid);
      if (rec) {
        rec.link_slug = slugArg;
        rec.link_status = 'active';
        rec.status = 'published';
        rec.published_at = new Date().toISOString();
      }
    }
    return createQueryResult([{ id: crypto.randomUUID(), slug: slugArg || 'new-skinner' }]);
  }

  // 18. Mutations: Update skinners
  if (norm.includes('update skinners')) {
    const idArg = (args.find(a => typeof a === 'string' && USER_CREATED_SKINNERS.has(a)) as string) || (globalThis as unknown as { __lastCreatedSkinnerId?: string }).__lastCreatedSkinnerId;
    if (idArg) {
      const rec = USER_CREATED_SKINNERS.get(idArg);
      if (rec) {
        if (norm.includes("status = 'published'") || norm.includes('published')) {
          rec.status = 'published';
          rec.published_at = rec.published_at || new Date().toISOString();
          rec.link_status = 'active';
        }
        rec.updated_at = new Date().toISOString();
      }
    }
    return createQueryResult([{ count: 1 }]);
  }

  // 19. Mutations: Update products
  if (norm.includes('update products')) {
    return createQueryResult([{ count: 1 }]);
  }

  // 20. Sessions & Users
  if (norm.includes('from sessions')) {
    return createQueryResult([]);
  }

  // 21. Reports
  if (norm.includes('from reports')) {
    return createQueryResult([]);
  }

  // Default fallback for unhandled queries (inserts, updates, deletes, count queries)
  return createQueryResult([]);
}

function createMockSql(): Sql {
  const sqlFn = function (strings: TemplateStringsArray | Record<string, unknown> | unknown[], ...values: unknown[]): unknown {
    if (Array.isArray(strings) && 'raw' in strings) {
      // Called as tagged template: sql`select ...`
      const tArray = strings as TemplateStringsArray;
      const fragment: SqlFragment = {
        __isSqlFragment: true,
        strings: [...tArray],
        values,
        then(onfulfilled, onrejected) {
          const { text, args } = flattenFragment(fragment.strings, fragment.values);
          const result = executeMockQuery(text, args);
          return Promise.resolve(result).then(onfulfilled, onrejected);
        },
        catch(onrejected) {
          return this.then(undefined, onrejected);
        },
        finally(onfinally) {
          return this.then(
            res => { if (onfinally) onfinally(); return res; },
            err => { if (onfinally) onfinally(); throw err; }
          );
        },
      };
      return fragment;
    }

    // Helper syntax: sql(record) or sql(records, ...columns)
    const helperObj = {
      __isSqlFragment: true,
      strings: [''],
      values: [],
      then(onfulfilled?: (val: unknown[]) => unknown) {
        return Promise.resolve([]).then(onfulfilled);
      },
      catch(onrejected?: (val: unknown) => unknown) {
        return Promise.resolve([]).catch(onrejected);
      },
      finally(onfinally?: () => void) {
        if (onfinally) onfinally();
        return Promise.resolve([]);
      },
    };
    return helperObj;
  } as unknown as Sql;

  sqlFn.json = (val: unknown) => val as never;
  sqlFn.unsafe = (query: string, args: unknown[] = []) => {
    return {
      __isSqlFragment: true,
      strings: [query],
      values: args,
      then(onfulfilled?: (val: unknown[]) => unknown) {
        const result = executeMockQuery(query, args);
        return Promise.resolve(result).then(onfulfilled);
      },
      catch(onrejected?: (val: unknown) => unknown) {
        return Promise.resolve([]).catch(onrejected);
      },
      finally(onfinally?: () => void) {
        if (onfinally) onfinally();
        return Promise.resolve([]);
      },
    } as never;
  };
  sqlFn.begin = (async (cb: (s: Sql) => Promise<unknown>) => {
    return cb(sqlFn);
  }) as never;
  sqlFn.end = (async () => {}) as never;

  return sqlFn;
}

function isValidPostgresUrl(str?: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return false;
  if (!/^postgres(ql)?:\/\/.+/i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean((parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') && parsed.host);
  } catch {
    return false;
  }
}

function create(): Sql {
  const rawUrl = process.env.DATABASE_URL;
  if (!isValidPostgresUrl(rawUrl)) {
    return createMockSql();
  }
  const url = rawUrl!.trim();
  const local = /localhost|127\.0\.0\.1/.test(url);
  try {
    return postgres(url, {
      max: local ? 1 : Number(process.env.DB_POOL_MAX || 5),
      ssl: local ? false : 'require',
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
      transform: { undefined: null },
    });
  } catch {
    return createMockSql();
  }
}

function get(): Sql {
  return (globalThis.__skinifySql ??= create());
}

/** Lazily-connected client: safe at build time and works offline without real PostgreSQL */
export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _this, args: unknown[]) => {
    const client = get() as unknown as (...a: unknown[]) => unknown;
    return client(...args);
  },
  get: (_t, p) => {
    const s = get() as unknown as Record<string | symbol, unknown>;
    const v = s[p];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(s) : v;
  },
});
