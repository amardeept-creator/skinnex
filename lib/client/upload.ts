'use client';
export type Kind = 'model' | 'image' | 'video';
const DIRECT_MAX = 4 * 1048576;
export interface UploadedAsset { id: string; kind: Kind; url: string; mime: string; bytes: number; original_bytes: number; original_filename: string; meta: Record<string, unknown> }
/** Small files: multipart to our API. Large files: direct browser → Vercel Blob upload, then server-side validation. */
export async function uploadAsset(file: File, kind: Kind, onProgress?: (p: number) => void): Promise<UploadedAsset> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (kind === 'model' && !['glb', 'gltf'].includes(ext || '')) throw new Error('3D models must be .glb or .gltf files.');
  if (file.size <= DIRECT_MAX) {
    const fd = new FormData(); fd.append('file', file); fd.append('kind', kind);
    onProgress?.(0.3);
    const r = await fetch('/api/assets', { method: 'POST', body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Upload failed');
    onProgress?.(1); return d.asset;
  }
  const { upload } = await import('@vercel/blob/client');
  const me = await fetch('/api/me').then(r => r.json());
  const blob = await upload(`staging/${me.sellerId}/${file.name.replace(/[^\w.\-]+/g, '_')}`, file, {
    access: 'public', handleUploadUrl: '/api/assets/token', clientPayload: JSON.stringify({ kind }),
    contentType: kind === 'model' ? (ext === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary') : file.type,
    onUploadProgress: (e) => onProgress?.(e.percentage / 100 * 0.85),
  }).catch((e) => { throw new Error(/storage|503|Blob/i.test(String(e?.message)) ? 'Files over 4 MB need Vercel Blob storage configured on this deployment.' : (e?.message || 'Upload failed')); });
  onProgress?.(0.9);
  const r = await fetch('/api/assets/finalize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: blob.url, kind, filename: file.name }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Processing failed');
  onProgress?.(1); return d.asset;
}
