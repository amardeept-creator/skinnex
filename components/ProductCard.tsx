import Link from 'next/link';
import { formatPrice, TRACKER_LABEL, CATEGORY_TINT } from '@/lib/format';
import type { CardProduct } from '@/lib/server/catalog';
import { FavButton } from './FavButton';

export function ProductCard({ p, priority = false }: { p: CardProduct; priority?: boolean }) {
  const href = `/p/${p.brand_slug}/${p.slug}`;
  const price = formatPrice(p.price_cents, p.currency);
  return (
    <article className="p-card">
      <Link href={href} className="p-media" style={{ ['--tint' as string]: CATEGORY_TINT[p.category_slug] || '#EEE9FF' }} aria-label={`${p.name} by ${p.brand_name}`}>
        {p.image && <img className={`main${p.image2 ? ' has-alt' : ''}`} src={p.image} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" />}
        {p.image2 && <img className="alt" src={p.image2} alt="" loading="lazy" decoding="async" />}
        {p.link_slug && <span className="badge badge-ar"><i />{TRACKER_LABEL[p.tracking_profile || ''] || 'AR'}</span>}
      </Link>
      <div className="fav" style={{ position: 'absolute', top: 10, right: 10 }}>
        <FavButton fav={{ id: p.id, href, name: p.name, brand: p.brand_name, image: p.image }} />
      </div>
      <div className="p-body">
        <Link href={`/b/${p.brand_slug}`} className="p-brand">{p.brand_name}</Link>
        <Link href={href} className="p-name">{p.name}</Link>
        {price && <div className="p-price">{price}</div>}
        <div className="p-actions">
          {p.link_slug
            ? <Link href={`/s/${p.link_slug}?src=discover`} className="btn btn-sm try-btn"><span className="lens" />Try Skinner</Link>
            : <span className="btn btn-sm btn-ghost" aria-disabled="true">AR unavailable</span>}
          <Link href={href} className="btn btn-sm btn-ghost view">View</Link>
        </div>
      </div>
    </article>
  );
}
