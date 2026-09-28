import { notFound } from 'next/navigation';
import { pageSeller } from '@/lib/server/auth';
import { wizardContext } from '@/lib/server/wizard';
import { getOwnedSkinner } from '@/lib/server/skinners';
import { SkinnerWizard } from '@/components/dash/SkinnerWizard';
import { StatusBadge, liveState } from '@/components/dash/StatusBadge';
import { SkinnerActions } from '@/components/dash/SkinnerActions';
import { formatDate } from '@/lib/format';

export default async function EditSkinner({ params }: { params: Promise<{ id: string }> }) {
  const u = await pageSeller(); const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [s, ctx] = await Promise.all([getOwnedSkinner(u.sellerId, id), wizardContext(u.sellerId)]);
  if (!s) notFound();
  const state = liveState({ status: s.status, admin_disabled: s.admin_disabled, link_expires: s.link_expires }, ctx.e.active);
  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusBadge state={state} />
        <span className="small muted">Created {formatDate(s.created_at)} · Updated {formatDate(s.updated_at)}{s.published_at ? ` · Published ${formatDate(s.published_at)}` : ''}{s.link_expires ? ` · Link expires ${formatDate(s.link_expires)}` : ''}</span>
        {s.admin_disabled && <span className="small" style={{ color: 'var(--danger)' }}>Disabled by SKINIFY moderation{s.disabled_reason ? `: ${s.disabled_reason}` : ''}</span>}
        <span className="spacer" /><SkinnerActions id={s.id} slug={s.link_slug} state={state} compact={false} />
      </div>
      <SkinnerWizard brands={ctx.brands} categories={ctx.categories} assets={ctx.assets} canEmbed={ctx.canEmbed} branding={ctx.branding}
        initial={{ id: s.id, brandId: s.brand_id, status: s.status, linkSlug: s.link_slug, linkExpires: s.link_expires ? new Date(s.link_expires).toISOString() : null,
          product: { name: s.p_name, category: s.category_slug, description: s.description, price: s.price_cents == null ? null : s.price_cents / 100, currency: s.currency, purchaseUrl: s.purchase_url || '', tags: s.tags || [], colors: s.colors || [], images: (s.images || []).map((i: { url: string }) => i.url), videoUrl: s.video_url },
          variants: s.variants.map((v: { name: string; color_hex: string | null; ar_overrides: object }) => ({ name: v.name, color_hex: v.color_hex, ar_overrides: v.ar_overrides })), profile: s.tracking_profile, assetId: s.asset_id, config: s.config }} />
    </>
  );
}
