import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { json, handle, HttpError } from '@/lib/server/http';
import { getUser } from '@/lib/server/auth';
import { uploadQuota, type AssetKind } from '@/lib/server/assets';
import { storageDriver } from '@/lib/server/storage';

/** Issues short-lived Vercel Blob client-upload tokens for large files. Uploads land in a staging path;
 *  /api/assets/finalize validates + optimises them and records the asset. */
export const POST = handle(async (req: Request) => {
  if (storageDriver() !== 'blob') throw new HttpError(503, 'Large uploads require Vercel Blob (BLOB_READ_WRITE_TOKEN).');
  const body = (await req.json()) as HandleUploadBody;
  const r = await handleUpload({
    body, request: req,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const u = await getUser(); if (!u?.sellerId) throw new Error('Not signed in');
      const kind = (JSON.parse(clientPayload || '{}').kind || 'model') as AssetKind;
      if (!['model', 'image', 'video'].includes(kind)) throw new Error('bad kind');
      if (!pathname.startsWith(`staging/${u.sellerId}/`)) throw new Error('bad path');
      const max = await uploadQuota(u.sellerId, kind);
      return {
        allowedContentTypes: kind === 'model' ? ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', 'application/json'] : kind === 'image' ? ['image/png', 'image/jpeg', 'image/webp'] : ['video/mp4', 'video/webm'],
        maximumSizeInBytes: max, addRandomSuffix: true, tokenPayload: JSON.stringify({ sellerId: u.sellerId, kind }),
      };
    },
    onUploadCompleted: async () => { /* finalize is called explicitly by the client */ },
  });
  return json(r);
});
