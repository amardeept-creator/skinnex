import { SiteHeader } from '@/components/SiteHeader';
import { Footer } from '@/components/Footer';
import { getUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const u = await getUser().catch(() => null);
  return (
    <>
      <SiteHeader user={u ? { name: u.name, isSeller: !!u.sellerId, isAdmin: u.isAdmin } : null} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
