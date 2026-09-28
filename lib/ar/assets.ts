/** 3D asset loading for Skinners: GLB/GLTF with meshopt + Draco decoding, caching, normalisation and variant overrides. */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { ARConfig, VariantOverrides } from './config';

let loader: GLTFLoader | null = null;
const cache = new Map<string, Promise<GLTF>>();

function getLoader() {
  if (loader) return loader;
  loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(process.env.NEXT_PUBLIC_DRACO_DECODER_PATH || 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.setCrossOrigin('anonymous');
  return loader;
}

export function loadModel(url: string, onProgress?: (p: number) => void): Promise<GLTF> {
  if (!cache.has(url)) {
    cache.set(url, new Promise((res, rej) => getLoader().load(url, res, (e) => { if (e.total) onProgress?.(e.loaded / e.total); }, (err) => { cache.delete(url); rej(err); })));
  }
  return cache.get(url)!;
}

/** Wrap a model so that the configured size mode is applied. Returns a group whose origin is the anchor point. */
export function normalise(scene: THREE.Object3D, cfg: ARConfig) {
  const root = new THREE.Group(); root.name = 'skinner-normalised';
  const inner = scene.clone(true);
  // clone materials so variant overrides never leak between instances
  inner.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone(); m.frustumCulled = false; } });
  root.add(inner);
  if (cfg.size.mode === 'fit') {
    const box = new THREE.Box3().setFromObject(inner); const size = box.getSize(new THREE.Vector3());
    const dim = cfg.size.fitAxis === 'max' ? Math.max(size.x, size.y, size.z) : size[cfg.size.fitAxis];
    const s = dim > 0 ? cfg.size.fitSize / dim : 1;
    inner.scale.setScalar(s);
    if (cfg.size.center) { const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s); inner.position.sub(c); }
  }
  return root;
}

export function applyOverrides(obj: THREE.Object3D, ov?: VariantOverrides | null) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats as THREE.MeshStandardMaterial[]) {
      const ud = m.userData as { base?: { color: string; metalness: number; roughness: number } };
      if (!ud.base) ud.base = { color: '#' + m.color.getHexString(), metalness: m.metalness, roughness: m.roughness };
      const o2 = ov?.materials?.[m.name];
      m.color.set(o2?.color ?? ud.base.color);
      m.metalness = o2?.metalness ?? ud.base.metalness;
      m.roughness = o2?.roughness ?? ud.base.roughness;
    }
  });
}

export function listMaterials(obj: THREE.Object3D) {
  const names = new Set<string>();
  obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => x.name && names.add(x.name)); });
  return [...names];
}
