import Link from 'next/link';
import { listCategories } from '@/lib/server/catalog';
import { CATEGORY_TINT } from '@/lib/format';
export const metadata = { title: 'Categories' };
const IMG: Record<string, string> = { jewellery: 'ring-solitaire', nails: 'nails-blush-almond', watches: 'watch-meridian', eyewear: 'glasses-round', beauty: 'lips-rosewood', fashion: 'hat-beanie', accessories: 'bag-tote', home: 'home-vase' };
export default async function Categories() {
  const cats = await listCategories();
  return (
    <div className="container" style={{ paddingBlock: '32px 40px' }}>
      <div className="eyebrow">Browse by what you want to try</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginTop: 8, marginBottom: 28 }}>Categories</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 18 }}>
        {cats.map(c => (
          <Link key={c.slug} href={`/explore?category=${c.slug}`} className="brand-tile" style={{ background: CATEGORY_TINT[c.slug] }}>
            <div className="cover" style={{ aspectRatio: '16/9' }}>{IMG[c.slug] ? <img src={`/seed/img/${IMG[c.slug]}-1.webp`} alt="" loading="lazy" /> : <span className="faint">Coming soon</span>}</div>
            <div style={{ padding: 18, background: 'rgba(255,255,255,.6)' }}><div className="row"><b style={{ fontSize: 18 }}>{c.name}</b><span className="spacer" /><span className="badge">{c.product_count}</span></div><div className="small muted" style={{ marginTop: 4 }}>{c.description}</div></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
