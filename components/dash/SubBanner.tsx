import Link from 'next/link';
import { formatDate } from '@/lib/format';
export function SubBanner({ status, active, expiresAt, plan }: { status: string; active: boolean; expiresAt: string | null; plan: string | null }) {
  if (!active) return <div className="alert alert-danger" style={{ marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}><b>Your {plan ?? ''} plan has expired.</b><span>Your Skinners are inactive and their links show a paused page. Nothing has been deleted.</span><span className="spacer" /><Link href="/dashboard/subscription" className="btn btn-sm btn-primary">Renew</Link></div>;
  if (status === 'trialing' && expiresAt) {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 864e5);
    return <div className="alert alert-info" style={{ marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}><b>Free trial · {days} day{days === 1 ? '' : 's'} left</b><span>Ends {formatDate(expiresAt)}.</span><span className="spacer" /><Link href="/dashboard/subscription" className="btn btn-sm btn-ghost">See plans</Link></div>;
  }
  if (status === 'past_due') return <div className="alert alert-warn" style={{ marginBottom: 20 }}><b>Payment past due.</b> Update billing to keep your Skinners live.</div>;
  return null;
}
