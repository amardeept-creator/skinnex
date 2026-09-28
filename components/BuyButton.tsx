'use client';
import { track } from '@/lib/client/track';
import { I } from './Icons';
export function BuyButton({ url, productId, skinnerId, isDemo, brand, className = 'btn btn-primary', source }: { url: string | null; productId: string; skinnerId?: string | null; isDemo?: boolean; brand: string; className?: string; source?: string }) {
  if (!url) return <span className={className} aria-disabled="true" title={isDemo ? 'Demo brands have no real store' : 'The brand has not added a store link'}><I.bag size={18} />{isDemo ? 'Demo — not for sale' : 'Store link coming soon'}</span>;
  return <a className={className} href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track('buy_click', { productId, skinnerId, source })}><I.bag size={18} />Buy from {brand}</a>;
}
