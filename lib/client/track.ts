'use client';
/** Client analytics beacon. Only genuine user actions are sent. No camera data is ever included. */
export interface TrackPayload { skinnerId?: string | null; productId?: string | null; source?: string | null; durationMs?: number; meta?: Record<string, unknown> }
function sid() {
  try { let s = sessionStorage.getItem('skn_sid'); if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('skn_sid', s); } return s; } catch { return 'nosession'; }
}
export function device() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent; if (/iPad|Tablet/i.test(ua)) return 'tablet'; if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'; return 'desktop';
}
export function track(event: string, p: TrackPayload = {}) {
  if (p.source === 'preview') return; // seller previews never count
  const body = JSON.stringify({ event, skinnerId: p.skinnerId ?? null, productId: p.productId ?? null, source: p.source ?? null, durationMs: p.durationMs ?? null, meta: p.meta ?? {}, sessionId: sid(), device: device() });
  try {
    if (navigator.sendBeacon) { navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' })); return; }
  } catch { /* fall through */ }
  fetch('/api/events', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
}
