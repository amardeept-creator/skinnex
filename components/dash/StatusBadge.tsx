export type LiveState = 'live' | 'draft' | 'unpublished' | 'disabled' | 'sub_expired' | 'link_expired';
export function liveState(s: { status: string; admin_disabled: boolean; link_expires?: string | Date | null; expires_at?: string | Date | null }, subActive: boolean): LiveState {
  if (s.admin_disabled) return 'disabled';
  if (s.status === 'draft') return 'draft';
  if (s.status === 'unpublished') return 'unpublished';
  if (!subActive) return 'sub_expired';
  const exp = s.link_expires ?? s.expires_at; if (exp && new Date(exp).getTime() <= Date.now()) return 'link_expired';
  return 'live';
}
const MAP: Record<LiveState, [string, string]> = { live: ['Live', 'badge-success'], draft: ['Draft', ''], unpublished: ['Unpublished', ''], disabled: ['Disabled by SKINIFY', 'badge-danger'], sub_expired: ['Inactive · plan expired', 'badge-warn'], link_expired: ['Link expired', 'badge-warn'] };
export function StatusBadge({ state }: { state: LiveState }) { const [l, c] = MAP[state]; return <span className={`badge ${c}`}>{state === 'live' && <i style={{ width: 6, height: 6, borderRadius: 9, background: 'currentColor' }} />}{l}</span>; }
