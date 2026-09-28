import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBrandPage } from '@/lib/server/catalog';
import { ProductCard } from '@/components/ProductCard';
import { BrandMark } from '@/components/BrandMark';
import { I } from '@/components/Icons';

type Params = Promise<{ brand: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> { const d = await getBrandPage((await params).brand); return { title: d ? d.brand.name : 'Brand not found' }; }

export default async function BrandPage({ params }: { params: Params }) {
  const d = await getBrandPage((await params).brand); if (!d) notFound();
  const { brand: b, products } = d;
  const safeUrl = b.website && /^https?:\/\//.test(b.website) ? b.website : null;
  return (
    <>
      <section style={{ background: `radial-gradient(60% 100% at 10% 0%, ${b.accent}33, transparent 70%), radial-gradient(50% 90% at 100% 0%, #f6dde633, transparent 60%)`, padding: '48px 0 28px' }}>
        <div className="container row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <BrandMark name={b.name} accent={b.accent} logo={b.logo_url} size={84} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="row" style={{ gap: 8 }}>{b.is_demo && <span className="badge">Demo brand · sample catalogue</span>}</div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginTop: 6 }}>{b.name}</h1>
            <p className="muted" style={{ maxWidth: 620, marginTop: 8, fontSize: 16 }}>{b.description || b.tagline}</p>
          </div>
          {safeUrl && <a href={safeUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost">Visit store <I.arrow size={15} /></a>}
        </div>
      </section>
      <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <p className="small muted" style={{ marginBottom: 16 }}>{products.length} products</p>
        {products.length ? <div className="p-grid">{products.map(p => <ProductCard key={p.id} p={p} />)}</div> : <div className="card card-pad muted" style={{ textAlign: 'center', padding: 48 }}>This brand hasn’t published any Skinners yet.</div>}
      </div>
    </>
  );
}
