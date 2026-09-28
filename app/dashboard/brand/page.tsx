import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { BrandForm } from '@/components/dash/BrandForm';
export default async function Brand() {
  const u = await pageSeller();
  const [b] = await sql`select * from brands where seller_id = ${u.sellerId} order by created_at limit 1`;
  return (
    <>
      <div className="dash-head"><div><h1>Brand settings</h1><p className="small muted" style={{ marginTop: 6 }}>Public store page: <a href={`/b/${b.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--iris)' }}>/b/{b.slug}</a></p></div></div>
      <div className="card card-pad" style={{ maxWidth: 720 }}><BrandForm next="/dashboard/brand" initial={{ id: b.id, name: b.name, tagline: b.tagline, description: b.description, website: b.website || '', logoUrl: b.logo_url, accent: b.accent, instagram: b.instagram || '' }} /></div>
    </>
  );
}
