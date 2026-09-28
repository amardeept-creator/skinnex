import Link from 'next/link';
import { pageSeller } from '@/lib/server/auth';
import { wizardContext } from '@/lib/server/wizard';
import { canCreateSkinner } from '@/lib/server/entitlements';
import { SkinnerWizard } from '@/components/dash/SkinnerWizard';

export default async function NewSkinner({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const u = await pageSeller(); const sp = await searchParams;
  const ctx = await wizardContext(u.sellerId);
  const block = canCreateSkinner(ctx.e);
  if (block) return <div className="card card-pad" style={{ maxWidth: 560 }}><h1 style={{ fontSize: 30 }}>You can’t create a Skinner right now</h1><p className="muted" style={{ marginTop: 10 }}>{block}</p><Link href="/dashboard/subscription" className="btn btn-primary" style={{ marginTop: 18 }}>View plans</Link></div>;
  return <SkinnerWizard first={sp.first === '1'} brands={ctx.brands} categories={ctx.categories} assets={ctx.assets} canEmbed={ctx.canEmbed} branding={ctx.branding}
    initial={{ brandId: (ctx.brands as { id: string }[])[0].id, product: { name: '', category: '', description: '', price: null, currency: 'USD', purchaseUrl: '', tags: [], colors: [], images: [], videoUrl: null }, variants: [], profile: 'finger_ring', assetId: null, config: null }} />;
}
