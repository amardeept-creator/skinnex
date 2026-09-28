import { pageSeller } from '@/lib/server/auth';
import { sql } from '@/lib/server/db';
import { getEntitlement } from '@/lib/server/entitlements';
import { formatBytes, formatDate } from '@/lib/format';
import { AssetLibrary } from '@/components/dash/AssetLibrary';

export default async function Assets() {
  const u = await pageSeller();
  const [e, rows] = await Promise.all([getEntitlement(u.sellerId), sql`select a.id, a.kind, a.url, a.original_filename, a.bytes, a.original_bytes, a.meta, a.created_at, (select count(*)::int from skinners s where s.asset_id = a.id) as used
    from ar_assets a where a.seller_id = ${u.sellerId} and a.status = 'ready' order by a.created_at desc`]);
  const quota = (e.limits?.storage_mb ?? 0) * 1048576;
  return (
    <>
      <div className="dash-head"><div><h1>3D assets</h1><p className="small muted" style={{ marginTop: 6 }}>{formatBytes(e.usage.storageBytes)} of {formatBytes(quota)} used · max {e.limits?.max_upload_mb ?? 0} MB per file</p></div></div>
      <div className="bar" style={{ marginBottom: 18 }}><i style={{ width: `${Math.min(100, (e.usage.storageBytes / Math.max(1, quota)) * 100)}%` }} /></div>
      <AssetLibrary items={rows.map(r => ({ id: r.id, kind: r.kind, url: r.url, name: r.original_filename, size: formatBytes(r.bytes), saved: r.original_bytes > r.bytes ? `${Math.round((1 - r.bytes / r.original_bytes) * 100)}% smaller after optimisation` : null, tris: r.meta?.triangles ?? null, materials: r.meta?.materials ?? [], warnings: r.meta?.warnings ?? [], date: formatDate(r.created_at), used: r.used }))} />
      <div className="card card-pad" style={{ marginTop: 20 }}>
        <b>What happens to an uploaded model</b>
        <ol className="small muted" style={{ lineHeight: 1.8, marginTop: 8 }}>
          <li>Binary signature and glTF 2.0 header are checked (the file extension and browser MIME type are not trusted).</li>
          <li>The model is parsed; meshes, triangle count (max 400k), textures and materials are inspected.</li>
          <li>Duplicate data is merged, unused data removed and geometry Meshopt-compressed.</li>
          <li>The optimised GLB is stored on a CDN with immutable caching and lazy-loaded only when a customer opens the Skinner.</li>
        </ol>
      </div>
    </>
  );
}
