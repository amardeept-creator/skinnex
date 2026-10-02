import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { redirect } from 'next/navigation';
import { getEntitlement } from '@/lib/server/entitlements';
import { DashNav } from '@/components/dash/DashNav';
import { SubBanner } from '@/components/dash/SubBanner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Studio', robots: { index: false } };

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const u = await pageSeller();
  const brands = await sql`select id, name, slug, logo_url, accent from brands where seller_id = ${u.sellerId} order by created_at limit 1`;
  const brand = brands[0] || { id: 'b0000000-0000-0000-0000-000000000001', name: 'My Brand', slug: 'my-brand', logo_url: null, accent: '#6E4CF5' };
  const e = await getEntitlement(u.sellerId);
  return (
    <div className="dash">
      <DashNav brand={{ name: brand.name, accent: brand.accent, logo: brand.logo_url, slug: brand.slug }} user={{ name: u.name, email: u.email, isAdmin: u.isAdmin }} plan={e.plan?.name ?? 'Studio'} />
      <div className="dash-main">
        {children}
      </div>
    </div>
  );
}
