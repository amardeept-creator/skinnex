import type { Metadata } from 'next';
import Link from 'next/link';
import { listProducts, listCategories } from '@/lib/server/catalog';
import { sql } from '@/lib/server/db';
import { ProductCard } from '@/components/ProductCard';
import { FilterBar } from '@/components/FilterBar';
import { SearchBox } from '@/components/SearchBox';

export const metadata: Metadata = { title: 'Explore Skinners' };
type SP = Promise<Record<string, string | undefined>>;

export default async function Explore({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const f = { q: sp.q, category: sp.category, brand: sp.brand, color: sp.color, min: sp.min ? Number(sp.min) : undefined, max: sp.max ? Number(sp.max) : undefined, sort: (sp.sort as 'trending') || 'trending', ar: sp.ar === '1', limit: 24, offset: (page - 1) * 24 };
  const [{ items, total }, cats, brands] = await Promise.all([listProducts(f), listCategories(), sql`select slug, name from brands where status = 'active' order by name`]);
  const cat = cats.find(c => c.slug === sp.category);
  const title = sp.q ? `“${sp.q}”` : cat ? cat.name : sp.sort === 'new' ? 'New Skinners' : sp.sort === 'trending' || !sp.sort ? 'Explore' : 'Explore';
  const qs = (p: number) => { const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); n.set('page', String(p)); return `?${n}`; };
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div className="row" style={{ alignItems: 'end', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="eyebrow">{sp.q ? 'Search results' : cat ? cat.description : 'Every product you can try on'}</div>
          <h1 style={{ fontSize: 'clamp(34px, 5vw, 60px)', marginTop: 8 }}>{title}</h1>
        </div>
        <SearchBox initial={sp.q || ''} />
      </div>
      <FilterBar categories={cats as never} brands={brands as never} />
      <p className="small muted" style={{ margin: '10px 0 18px' }}>{total} {total === 1 ? 'product' : 'products'}{f.sort === 'trending' ? ' · trending ranks by real try-ons & launches in the last 7 days' : ''}</p>
      {items.length ? <div className="p-grid">{items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}</div> : (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 44 }} aria-hidden>◌</div>
          <h2 style={{ fontSize: 28, marginTop: 8 }}>{cat && !sp.q ? `No ${cat.name.toLowerCase()} Skinners yet` : 'Nothing matches that yet'}</h2>
          <p className="muted" style={{ marginTop: 8 }}>{cat && !sp.q ? 'Brands haven’t published any in this category. Check back soon — or create the first one.' : 'Try a broader search, a colour, or a different category.'}</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}><Link href="/explore" className="btn btn-primary">Browse everything</Link>{cat && <Link href="/dashboard/skinners/new" className="btn btn-ghost">Create a Skinner</Link>}</div>
        </div>
      )}
      {total > page * 24 && <div className="row" style={{ justifyContent: 'center', marginTop: 28 }}><Link href={qs(page + 1)} className="btn btn-ghost">Load more</Link></div>}
    </div>
  );
}
