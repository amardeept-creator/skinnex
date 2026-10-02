import Link from 'next/link';
import { listProducts, listCategories, featuredBrands } from '@/lib/server/catalog';
import { ProductCard } from '@/components/ProductCard';
import { Viewer3D } from '@/components/Viewer3D';
import { I } from '@/components/Icons';
import { CATEGORY_TINT } from '@/lib/format';
import { BrandMark } from '@/components/BrandMark';

const CAT_IMG: Record<string, string> = {
  jewellery: '/seed/img/ring-solitaire-1.webp', nails: '/seed/img/nails-blush-almond-1.webp', watches: '/seed/img/watch-meridian-1.webp', eyewear: '/seed/img/glasses-wayfarer-1.webp',
  beauty: '/seed/img/lips-rosewood-1.webp', fashion: '/seed/img/hat-beanie-1.webp', accessories: '/seed/img/bag-tote-1.webp', home: '/seed/img/home-vase-1.webp',
};

export default async function Home() {
  const [trending, fresh, cats, brands, nails, eyewear] = await Promise.all([
    listProducts({ sort: 'trending', ar: true, limit: 10 }),
    listProducts({ sort: 'new', limit: 8 }),
    listCategories(),
    featuredBrands(6),
    listProducts({ category: 'nails', limit: 4 }),
    listProducts({ category: 'eyewear', limit: 3 }),
  ]);
  const hasTrendingSignal = trending.items.some(p => (p.score ?? 0) > 0);
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge badge-iris" style={{ height: 28, padding: '0 12px', fontSize: 12 }}><I.sparkle size={14} /> Real-time AR try-on · in your browser</span>
            <h1 style={{ marginTop: 22 }}>Try it.<br /><span className="soft">Before you<br />buy it.</span></h1>
            <p className="hero-lede">Discover products, create your own AR experiences, and see how they look on you.</p>
            <div className="row" style={{ marginTop: 30, flexWrap: 'wrap' }}>
              <Link href="/explore" className="btn btn-lg try-btn"><span className="lens" />Explore Skinners</Link>
              <Link href="/dashboard/skinners/new" className="btn btn-lg btn-ghost">Create a Skinner</Link>
            </div>
            <div className="row small muted" style={{ marginTop: 26, flexWrap: 'wrap', gap: 18 }}>
              <span className="row" style={{ gap: 6 }}><I.shield size={16} /> Camera stays on your device</span>
              <span className="row" style={{ gap: 6 }}><I.hand size={16} /> Hand, face &amp; body tracking</span>
              <span className="row" style={{ gap: 6 }}><I.link size={16} /> No app to install</span>
            </div>
          </div>
          <div className="hero-stage">
            <Viewer3D url="/seed/models/ring-solitaire.glb" autoRotate zoom={0.95} style={{ position: 'absolute', inset: 0 }} label="Interactive 3D solitaire ring — drag to rotate" />
            <span className="tag badge badge-ar" style={{ top: 18, left: 18 }}><i />Interactive 3D · drag to rotate</span>
            <div className="float-card glass" style={{ left: 18, bottom: 18, right: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tiny faint" style={{ fontWeight: 700 }}>AURELLE · DEMO BRAND</div>
                <div style={{ fontWeight: 700 }}>Solitaire Diamond Ring</div>
                <div className="tiny muted">This exact 3D asset anchors to your ring finger in live AR.</div>
              </div>
              <Link href="/s/diamond-ring?src=discover" className="btn try-btn"><span className="lens" />Try on hand</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container" aria-label="Categories">
        <div className="cat-rail">
          {cats.filter(c => c.product_count > 0).map(c => (
            <Link key={c.slug} href={`/explore?category=${c.slug}`} className="cat-tile" style={{ ['--tint' as string]: CATEGORY_TINT[c.slug] }}>
              <span className="im">{CAT_IMG[c.slug] && <img src={CAT_IMG[c.slug]} alt="" loading="lazy" />}</span>
              <b>{c.name}</b><span className="tiny muted">{c.product_count} Skinner{c.product_count === 1 ? '' : 's'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <div><div className="eyebrow">{hasTrendingSignal ? 'Ranked by real try-ons this week' : 'Featured while trending data builds up'}</div><h2 className="section-title" style={{ marginTop: 8 }}>Trending Skinners</h2></div>
          <Link href="/explore?sort=trending" className="btn btn-ghost btn-sm">See all <I.arrow size={15} /></Link>
        </div>
        <div className="rail">{trending.items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 3} />)}</div>
      </section>

      <section className="container">
        <div className="dark-band" style={{ padding: 'clamp(26px, 5vw, 60px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 36, alignItems: 'center' }}>
            <div>
              <div className="eyebrow" style={{ color: '#b9a8ff' }}>Nail Skinners</div>
              <h2 style={{ fontSize: 'clamp(32px, 4.4vw, 56px)', marginTop: 10 }}>Your hand.<br />Every design.</h2>
              <p className="muted" style={{ marginTop: 16, maxWidth: 420 }}>Per-finger hand tracking places each nail on the right fingertip and follows you as you move. Switch shades live and compare shapes before you order.</p>
              <div className="row" style={{ marginTop: 24, flexWrap: 'wrap' }}>
                <Link href="/s/blush-almond?src=discover" className="btn btn-lg" style={{ background: '#fff', color: 'var(--ink)' }}><I.hand size={18} /> Try nails on</Link>
                <Link href="/explore?category=nails" className="btn btn-lg btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>All nail designs</Link>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {nails.items.map(p => (
                <Link key={p.id} href={`/p/${p.brand_slug}/${p.slug}`} style={{ borderRadius: 20, background: 'rgba(255,255,255,0.06)', padding: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ aspectRatio: '4/3', display: 'grid', placeItems: 'center' }}>{p.image && <img src={p.image} alt="" loading="lazy" style={{ width: '92%', height: '92%', objectFit: 'contain' }} />}</div>
                  <div className="small" style={{ fontWeight: 700, marginTop: 6 }}>{p.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <div><div className="eyebrow">Just published</div><h2 className="section-title" style={{ marginTop: 8 }}>New Skinners</h2></div>
          <Link href="/explore?sort=new" className="btn btn-ghost btn-sm">See all <I.arrow size={15} /></Link>
        </div>
        <div className="p-grid">{fresh.items.map(p => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          <div className="card card-pad" style={{ background: 'var(--aura), var(--surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 300 }}>
            <div><div className="eyebrow">Eyewear</div><h3 style={{ fontSize: 34, marginTop: 10 }}>Frames that follow<br />your face.</h3>
              <p className="muted" style={{ marginTop: 12, maxWidth: 360 }}>478-point face mesh, head pose and depth occlusion — temples disappear behind your head as you turn.</p></div>
            <div className="row" style={{ marginTop: 20 }}><Link href="/s/wayfarer-noir?src=discover" className="btn try-btn"><span className="lens" />Try sunglasses</Link><Link href="/explore?category=eyewear" className="btn btn-ghost">Browse</Link></div>
          </div>
          {eyewear.items.slice(0, 2).map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="section container">
        <div className="section-head"><div><div className="eyebrow">Featured brands</div><h2 className="section-title" style={{ marginTop: 8 }}>Stores to try on</h2></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
          {brands.map(b => (
            <Link key={b.slug} href={`/b/${b.slug}`} className="brand-tile">
              <div className="cover" style={{ background: `linear-gradient(135deg, ${b.accent}22, ${b.accent}0d)` }}>{b.cover && <img src={b.cover} alt="" loading="lazy" />}</div>
              <div className="row" style={{ padding: 16 }}>
                <BrandMark name={b.name} accent={b.accent} logo={b.logo_url} />
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700 }}>{b.name}</div><div className="tiny muted">{b.tagline}</div></div>
                <span className="spacer" /><span className="badge">{b.product_count}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container">
        <div className="steps3">
          {[
            { i: <I.search size={22} />, t: 'Discover', d: 'Search or browse Skinners by category, colour, brand or style.' },
            { i: <I.camera size={22} />, t: 'Try it on', d: 'Your camera opens, the product anchors to your hand, face or body and follows you.' },
            { i: <I.share size={22} />, t: 'Snap, share, buy', d: 'Capture a SKINIFY Snap, share it with friends, then buy from the brand’s own store.' },
          ].map(s => (
            <div key={s.t} className="card card-pad"><span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--lilac)', color: 'var(--iris-600)', display: 'grid', placeItems: 'center' }}>{s.i}</span>
              <h3 style={{ fontSize: 22, marginTop: 16 }}>{s.t}</h3><p className="muted" style={{ marginTop: 8 }}>{s.d}</p></div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="dark-band" style={{ padding: 'clamp(28px, 6vw, 72px)', background: 'radial-gradient(60% 80% at 100% 0%, #3a2a7a 0%, transparent 60%), radial-gradient(40% 60% at 0% 100%, #5a2340 0%, transparent 60%), #141118' }}>
          <div className="eyebrow" style={{ color: '#b9a8ff' }}>For brands</div>
          <h2 style={{ fontSize: 'clamp(38px, 6vw, 84px)', marginTop: 12, lineHeight: 0.92 }}>Create once.<br />Share anywhere.</h2>
          <p className="muted" style={{ marginTop: 18, maxWidth: 560, fontSize: 17 }}>Stop saying “imagine how this looks on you”. Upload your product, pick how it tracks, publish — and get one link that works on Instagram, WhatsApp, your website, email, QR codes and packaging.</p>
          <div className="flow" style={{ marginTop: 32 }}>
            {['Create your product', 'Build the Skinner', 'Publish & get link', 'Share anywhere'].map((t, i) => <div key={t} className="flow-step"><div className="n">0{i + 1}</div><div style={{ fontWeight: 700, marginTop: 6 }}>{t}</div></div>)}
          </div>
          <div className="row" style={{ marginTop: 28, flexWrap: 'wrap' }}>
            <span className="link-pill"><I.link size={16} />{new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").host}/s/diamond-ring</span>
            <Link href="/dashboard/skinners/new" className="btn btn-lg" style={{ background: '#fff', color: 'var(--ink)' }}>Create a Skinner</Link>
            <Link href="/explore" className="btn btn-lg btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>Explore</Link>
          </div>
        </div>
      </section>
    </>
  );
}
