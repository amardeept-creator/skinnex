import 'server-only';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

export interface GlbReport {
  ok: boolean; error?: string; warnings: string[];
  bytesIn: number; bytesOut: number; optimized: boolean;
  bbox?: { min: number[]; max: number[]; size: number[] };
  triangles: number; meshes: number; materials: string[]; textures: number; maxTextureSize: number; extensions: string[];
}

const MAX_TRIS = 400_000;

/** Structural validation of a binary glTF 2.0 container before any parsing. */
export function sniffGlb(buf: Uint8Array): string | null {
  if (buf.length < 20) return 'File is too small to be a GLB.';
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) return 'Not a GLB file (missing glTF header). Export your model as .glb (binary glTF 2.0).';
  if (dv.getUint32(4, true) !== 2) return 'Only glTF 2.0 is supported.';
  if (dv.getUint32(8, true) !== buf.length) return 'GLB length header does not match the file size (corrupt upload?).';
  if (dv.getUint32(16, true) !== 0x4e4f534a) return 'GLB is missing its JSON chunk.';
  return null;
}

export async function processGlb(input: Uint8Array): Promise<{ report: GlbReport; output: Uint8Array }> {
  const warnings: string[] = [];
  const base: GlbReport = { ok: false, warnings, bytesIn: input.length, bytesOut: input.length, optimized: false, triangles: 0, meshes: 0, materials: [], textures: 0, maxTextureSize: 0, extensions: [] };
  const sniff = sniffGlb(input); if (sniff) return { report: { ...base, error: sniff }, output: input };
  await MeshoptDecoder.ready; await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  let doc;
  try { doc = await io.readBinary(input); }
  catch (e) {
    const msg = String((e as Error).message || e);
    if (/draco/i.test(msg)) { warnings.push('Draco-compressed model accepted as-is (server-side re-optimisation skipped; browser decodes Draco).'); return { report: { ...base, ok: true }, output: input }; }
    return { report: { ...base, error: 'The GLB could not be parsed: ' + msg.slice(0, 160) }, output: input };
  }
  const root = doc.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  if (!scene) return { report: { ...base, error: 'The GLB contains no scene.' }, output: input };
  let tris = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices(); const pos = prim.getAttribute('POSITION');
    const mode = prim.getMode();
    if (mode === 4) tris += (idx ? idx.getCount() : pos?.getCount() || 0) / 3;
  }
  const meshes = root.listMeshes().length;
  if (!meshes) return { report: { ...base, error: 'The GLB contains no meshes.' }, output: input };
  if (tris > MAX_TRIS) return { report: { ...base, triangles: tris, error: `Model has ${Math.round(tris).toLocaleString()} triangles; the limit is ${MAX_TRIS.toLocaleString()}. Please decimate it for mobile AR.` }, output: input };
  let maxTex = 0;
  for (const t of root.listTextures()) { const s = t.getSize(); if (s) maxTex = Math.max(maxTex, s[0], s[1]); }
  if (maxTex > 4096) warnings.push(`Largest texture is ${maxTex}px; 2048px or less is recommended for mobile.`);
  if (tris > 150_000) warnings.push('High polygon count may reduce frame rate on older phones.');
  const b = getBounds(scene);
  const size = [0, 1, 2].map(i => b.max[i] - b.min[i]);
  if (Math.max(...size) > 50) warnings.push('Model appears to be authored in centimetres or millimetres; SKINIFY will rescale it to real-world size.');
  const materials = root.listMaterials().map(m => m.getName() || '').filter(Boolean);
  const exts = root.listExtensionsUsed().map(e => e.extensionName);
  let output = input, optimized = false;
  try {
    await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    const out = await io.writeBinary(doc);
    if (out.length < input.length) { output = out; optimized = true; }
  } catch (e) { warnings.push('Optimisation skipped: ' + String((e as Error).message).slice(0, 120)); }
  return { report: { ...base, ok: true, bytesOut: output.length, optimized, bbox: { min: [...b.min], max: [...b.max], size }, triangles: Math.round(tris), meshes, materials, textures: root.listTextures().length, maxTextureSize: maxTex, extensions: exts }, output };
}

export function sniffImage(buf: Uint8Array): string | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  return null;
}
export function sniffVideo(buf: Uint8Array): string | null {
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'video/mp4';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}

/** Self-contained .gltf (JSON with data: URIs) → GLB. External-file .gltf must be packed by the seller. */
export async function gltfJsonToGlb(buf: Uint8Array): Promise<Uint8Array> {
  const text = Buffer.from(buf).toString('utf8');
  const json = JSON.parse(text);
  const ext = [...(json.buffers || []), ...(json.images || [])].some((b: { uri?: string }) => b.uri && !b.uri.startsWith('data:'));
  if (ext) throw new Error('This .gltf references external files. Export as a single .glb (binary glTF) or embed textures.');
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.readJSON({ json, resources: {} });
  return io.writeBinary(doc);
}
