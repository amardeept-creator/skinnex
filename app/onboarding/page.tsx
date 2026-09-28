import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { BrandForm } from '@/components/dash/BrandForm';
import { Logo } from '@/components/Logo';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up your brand', robots: { index: false } };
export default async function Onboarding() {
  const u = await pageSeller();
  const [b] = await sql`select id from brands where seller_id = ${u.sellerId} limit 1`;
  if (b) redirect('/dashboard');
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--aura), var(--bg)' }}>
      <div className="container" style={{ paddingBlock: '24px' }}><Link href="/"><Logo /></Link></div>
      <div className="container" style={{ maxWidth: 680, paddingBottom: 60 }}>
        <div className="row small" style={{ gap: 8, marginBottom: 18 }}><span className="badge badge-success">1 · Account ✓</span><span className="badge badge-dark">2 · Brand</span><span className="badge">3 · First Skinner</span></div>
        <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}>Tell customers who you are</h1>
        <p className="muted" style={{ margin: '10px 0 24px' }}>This appears on your public store page and inside every Skinner.</p>
        <div className="card card-pad"><BrandForm next="/dashboard/skinners/new?first=1" /></div>
      </div>
    </div>
  );
}
