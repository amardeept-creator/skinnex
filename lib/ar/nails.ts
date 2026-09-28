/** Procedural nail caps for Nail Skinners — shape, length, finish and pattern are all parametric. */
import * as THREE from 'three';
import type { NailDesign } from './config';

type Shape = NailDesign['shape'];
const TIP_START: Record<Shape, number> = { square: 0.9, round: 0.72, oval: 0.58, almond: 0.46, coffin: 0.52, stiletto: 0.3 };

function halfWidth(shape: Shape, v: number) {
  const base = 0.84 + 0.16 * Math.min(1, v / 0.14);
  const ts = TIP_START[shape];
  if (v <= ts) return base;
  const t = (v - ts) / (1 - ts);
  switch (shape) {
    case 'square': return base * Math.pow(Math.max(0, 1 - Math.pow(t, 8)), 0.5);
    case 'round': case 'oval': return base * Math.sqrt(Math.max(0, 1 - t * t));
    case 'almond': return base * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.45 * t);
    case 'coffin': return base * (1 - 0.42 * t);
    case 'stiletto': return base * Math.pow(Math.max(0, 1 - t), 1.15);
  }
}

/** Nail surface: origin at the cuticle, +Y toward the tip, +Z out of the nail. */
export function nailGeometry(shape: Shape, width: number, lengthMul: number) {
  const L = width * lengthMul;
  const NU = 12, NV = 22;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NV; j++) {
    const v = j / NV; const hw = (width / 2) * halfWidth(shape, v);
    for (let i = 0; i <= NU; i++) {
      const u = i / NU; const x = (u * 2 - 1) * hw;
      const z = -(x * x) / (width * 0.95) - Math.pow(v * L, 2) * (0.25 / L) + 0.0003;
      pos.push(x, v * L, z); uv.push(u, v);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i, b = a + NU + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function canvasTex(draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d')!;
  draw(x, 128, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const texCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');

export function nailMaterial(d: NailDesign, lengthMul: number) {
  const m = new THREE.MeshPhysicalMaterial({ color: d.color, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide });
  if (d.finish === 'matte') { m.roughness = 0.72; m.clearcoat = 0; }
  if (d.finish === 'chrome') { m.metalness = 1; m.roughness = 0.07; }
  if (d.finish === 'glitter') {
    const key = 'glitter' + d.color;
    if (!texCache.has(key)) texCache.set(key, canvasTex((x, w, h) => {
      x.fillStyle = d.color; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`; const s = Math.random() * 2.2 + 0.4; x.fillRect(Math.random() * w, Math.random() * h, s, s); }
    }));
    m.map = texCache.get(key)!; m.color.set('#ffffff'); m.metalness = 0.55; m.roughness = 0.28;
  }
  if (d.finish === 'french') {
    const tipFrac = Math.min(0.55, 0.26 + (lengthMul - 1) * 0.22);
    const key = `french${d.color}${d.tipColor}${tipFrac.toFixed(2)}`;
    if (!texCache.has(key)) texCache.set(key, canvasTex((x, w, h) => {
      x.fillStyle = d.color; x.fillRect(0, 0, w, h);
      x.fillStyle = d.tipColor; x.beginPath(); x.moveTo(0, h * tipFrac); x.quadraticCurveTo(w / 2, h * tipFrac * 1.45, w, h * tipFrac); x.lineTo(w, 0); x.lineTo(0, 0); x.fill();
    }));
    m.map = texCache.get(key)!; m.color.set('#ffffff');
  }
  if (d.textureUrl) {
    const t = loader.load(d.textureUrl); t.colorSpace = THREE.SRGBColorSpace; m.map = t; m.color.set('#ffffff');
  }
  return m;
}
