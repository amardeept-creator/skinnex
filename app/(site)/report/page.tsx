import { ReportForm } from '@/components/ReportForm';
export const metadata = { title: 'Report', robots: { index: false } };
export default async function Report({ searchParams }: { searchParams: Promise<{ product?: string; skinner?: string }> }) {
  const sp = await searchParams;
  return <div className="container" style={{ paddingBlock: '40px', maxWidth: 560 }}><h1 style={{ fontSize: 40 }}>Report a problem</h1><p className="muted" style={{ margin: '10px 0 22px' }}>Reports go to the SKINIFY moderation team.</p><ReportForm productId={sp.product} skinnerId={sp.skinner} /></div>;
}
