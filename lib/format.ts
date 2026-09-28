export function formatPrice(cents: number | null | undefined, currency = 'USD') {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}
export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));
}
export function formatBytes(n: number) { if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`; return `${(n / 1048576).toFixed(1)} MB`; }
export function num(n: number | null | undefined) { return new Intl.NumberFormat('en-US').format(n ?? 0); }
export function siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')).replace(/\/$/, ''); }
export const TRACKER_LABEL: Record<string, string> = {
  finger_ring: 'Finger tracking', wrist_watch: 'Wrist tracking', wrist_bracelet: 'Wrist tracking', nails: 'Nail tracking',
  face_glasses: 'Face tracking', face_earrings: 'Ear tracking', face_lips: 'Lip tracking', head_hat: 'Head tracking',
  body_necklace: 'Body tracking', body_bag: 'Body tracking', body_clothing: 'Body tracking', feet_shoes: 'Foot tracking', surface_place: 'Room placement',
};
export const CATEGORY_TINT: Record<string, string> = { jewellery: '#F3E9DD', nails: '#F8E1E7', watches: '#E6E9EE', eyewear: '#E9E4F7', beauty: '#F6DDE0', fashion: '#EEE6E1', accessories: '#ECE7DC', footwear: '#E3E8E4', home: '#EFE8DF', more: '#ECECEC' };
