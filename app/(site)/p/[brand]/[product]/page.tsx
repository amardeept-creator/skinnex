import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductPage, listProducts } from '@/lib/server/catalog';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductCard } from '@/components/ProductCard';
import { FavButton } from '@/components/FavButton';
import { ShareButton } from '@/components/ShareButton';
import { QrImage } from '@/components/QrImage';
import { ViewTracker } from '@/components/ViewTracker';
import { BrandMark } from '@/components/BrandMark';
import { BuyButton } from '@/components/BuyButton';
import { I } from '@/components/Icons';
import { formatPrice, CATEGORY_TINT } from '@/lib/format';
import { PROFILE_BY_KEY } from '@/lib/ar/config';

type Params = Promise<{ brand: string; product: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { brand, product } = await params; const p = await getProductPage(brand, product);
  if (!p) return { title: 'Product not found' };
  return { title: `${p.name} — ${p.brand_name}`, description: p.description?.slice(0, 160), openGraph: { images: p.images?.[0]?.url ? [p.images[0].url] : [] } };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { brand, product } = await params;
  const p = await getProductPage(brand, product);
  if (!p || p.status !== 'active') notFound();
  const profile = p.tracking_profile ? PROFILE_BY_KEY[p.tracking_profile] : null;
  const related = (await listProducts({ category: p.category_slug, limit: 5 })).items.filter(x => x.id !== p.id).slice(0, 4);
  const tint = CATEGORY_TINT[p.category_slug] || '#EEE9FF';
  const href = `/p/${p.brand_slug}/${p.slug}`;
  const nails = profile?.renderMode === 'nails' ? (p.config?.nails ?? null) : null;
  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <ViewTracker productId={p.id} />
      <nav className="small faint row" style={{ gap: 6, marginBottom: 18, flexWrap: 'wrap' }} aria-label="Breadcrumb">
        <Link href="/explore">Explore</Link><span>/</span><Link href={`/explore?category=${p.category_slug}`}>{p.category_name}</Link><span>/</span><span className="muted">{p.name}</span>
      </nav>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 'clamp(24px, 4vw, 56px)', alignItems: 'start' }}>
        <ProductGallery images={p.images || []} modelUrl={profile?.renderMode === 'model' ? p.model_url : null} nails={nails} config={p.config} tint={tint} name={p.name} />
        <div className="stack" style={{ gap: 20, position: 'sticky', top: 'calc(var(--header-h) + 16px)' }}>
          <Link href={`/b/${p.brand_slug}`} className="row" style={{ gap: 10 }}>
            <BrandMark name={p.brand_name} accent={p.brand_accent} logo={p.brand_logo} size={36} />
            <span><b>{p.brand_name}</b>{p.is_demo && <span className="badge" style={{ marginLeft: 8 }}>Demo brand</span>}<br /><span className="tiny muted">{p.brand_tagline}</span></span>
          </Link>
          <div>
            <h1 style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>{p.name}</h1>
            {p.price_cents != null && <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }} className="tabular">{formatPrice(p.price_cents, p.currency)}</div>}
          </div>
          {p.variants.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="label">{p.variants.length} options · switch live inside the Skinner</span>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{p.variants.map((v: { id: string; name: string; color_hex: string | null }) => <span key={v.id} className="chip">{v.color_hex && <i style={{ width: 14, height: 14, borderRadius: 99, background: v.color_hex, border: '1px solid rgba(0,0,0,.1)' }} />}{v.name}</span>)}</div>
            </div>
          )}
          {p.link_slug ? (<>
            <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #fff, #f4efff)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
              <div className="stack" style={{ gap: 10 }}>
                <Link href={`/s/${p.link_slug}?src=discover`} className="btn btn-xl try-btn btn-block"><span className="lens" />Try Skinner</Link>
                <div className="small muted row" style={{ gap: 6 }}><I.shield size={15} />{profile?.name} · {profile?.bodyPart.toLowerCase()} tracking · camera stays on your device{profile && profile.maturity !== 'stable' && <span className="badge badge-warn">{profile.maturity}</span>}</div>
              </div>
              <div className="hide-md stack" style={{ gap: 4, alignItems: 'center' }}><QrImage slug={p.link_slug} size={96} /><span className="tiny faint">Open on phone</span></div>
            </div>
            <div className="mobile-try"><Link href={`/s/${p.link_slug}?src=discover`} className="btn btn-lg try-btn btn-block"><span className="lens" />Try Skinner</Link></div>
          </>) : (
            <div className="alert alert-warn"><I.eye size={18} /> Live AR isn’t available for this product right now. {p.model_url || nails ? 'You can still inspect it in 3D.' : ''}</div>
          )}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <BuyButton url={p.purchase_url} productId={p.id} isDemo={p.is_demo} brand={p.brand_name} />
            <ShareButton url={p.link_slug ? `/s/${p.link_slug}?src=share` : href} title={`${p.name} by ${p.brand_name}`} productId={p.id} />
            <FavButton big fav={{ id: p.id, href, name: p.name, brand: p.brand_name, image: p.images?.[0]?.url ?? null }} />
          </div>
          {p.description && <p className="muted" style={{ fontSize: 16, whiteSpace: 'pre-line' }}>{p.description}</p>}
          {profile && (
            <details className="card card-pad"><summary style={{ cursor: 'pointer', fontWeight: 700 }}>How this Skinner tracks</summary>
              <p className="small muted" style={{ marginTop: 10 }}>{profile.description}</p>
              <p className="small muted" style={{ marginTop: 8 }}>AR placement is an estimate from your camera image — real size, fit and colour can differ. Tracking works best in good light.</p></details>
          )}
          {p.tags?.length > 0 && <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{p.tags.map((t: string) => <Link key={t} href={`/explore?q=${encodeURIComponent(t)}`} className="badge">#{t}</Link>)}</div>}
          <Link href={`/report?product=${p.id}`} className="tiny faint row" style={{ gap: 6 }}><I.flag size={13} />Report this product</Link>
        </div>
      </div>
      {related.length > 0 && <section className="section" style={{ paddingBottom: 0 }}><h2 className="section-title" style={{ marginBottom: 20 }}>More {p.category_name.toLowerCase()} to try</h2><div className="p-grid">{related.map(r => <ProductCard key={r.id} p={r} />)}</div></section>}
    </div>
  );
}
