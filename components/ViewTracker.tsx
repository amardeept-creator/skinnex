'use client';
import { useEffect } from 'react';
import { track } from '@/lib/client/track';
export function ViewTracker({ event = 'product_view', productId, skinnerId, source }: { event?: string; productId?: string; skinnerId?: string | null; source?: string }) {
  useEffect(() => { track(event, { productId, skinnerId, source: source || 'discover' }); }, [event, productId, skinnerId, source]);
  return null;
}
