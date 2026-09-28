import Link from 'next/link';
import type { LinkState } from '@/lib/server/links';
import { LogoMark } from '@/components/Logo';

const COPY: Record<Exclude<LinkState, 'ok'>, { title: string; body: string }> = {
  invalid: { title: 'This Skinner link isn’t valid', body: 'The link may be mistyped or incomplete. Check the link you were sent, or explore other Skinners.' },
  product_removed: { title: 'This product is no longer available', body: 'The brand has removed this product from SKINIFY.' },
  disabled: { title: 'This Skinner is unavailable', body: 'This experience has been paused while it is reviewed.' },
  unpublished: { title: 'This Skinner isn’t live right now', body: 'The brand has unpublished this experience. It may come back soon.' },
  subscription_expired: { title: 'This Skinner is currently inactive', body: 'The brand’s SKINIFY plan has ended, so this AR experience is paused. Nothing has been deleted — it will return when the brand renews.' },
  link_expired: { title: 'This Skinner link has expired', body: 'Links can have an expiry date set by the brand’s plan. Ask the brand for a fresh link.' },
  usage_limit: { title: 'This Skinner is very popular', body: 'The brand has reached its monthly AR session limit. Please try again later.' },
};

export function LinkStateScreen({ state, brand, product, sellerHint }: { state: Exclude<LinkState, 'ok'>; brand?: { name: string; slug: string } | null; product?: { name: string; slug: string; image?: string | null } | null; sellerHint?: boolean }) {
  const c = COPY[state];
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--aura), var(--bg)' }}>
      <div className="card" style={{ width: 'min(480px, 100%)', padding: 32, textAlign: 'center', borderRadius: 32 }}>
        <div style={{ display: 'inline-grid', placeItems: 'center', color: 'var(--ink)' }}><LogoMark size={44} /></div>
        {product?.image && <img src={product.image} alt="" style={{ width: 120, height: 120, objectFit: 'contain', margin: '18px auto 0', filter: 'grayscale(.4)', opacity: .8 }} />}
        <h1 style={{ fontSize: 30, marginTop: 18 }}>{c.title}</h1>
        {product && brand && <p className="small faint" style={{ marginTop: 6 }}>{product.name} · {brand.name}</p>}
        <p className="muted" style={{ marginTop: 12 }}>{c.body}</p>
        <div className="stack" style={{ marginTop: 24 }}>
          {brand && state !== 'product_removed' && state !== 'disabled' && <Link className="btn btn-primary btn-lg" href={`/b/${brand.slug}`}>More from {brand.name}</Link>}
          <Link className="btn btn-ghost btn-lg" href="/explore">Explore other Skinners</Link>
          {sellerHint && state === 'subscription_expired' && <Link className="small" href="/dashboard/subscription" style={{ color: 'var(--iris)', fontWeight: 700 }}>Is this your brand? Renew your plan →</Link>}
        </div>
      </div>
    </main>
  );
}
