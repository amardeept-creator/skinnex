import { z } from 'zod';

/**
 * Skinner AR configuration — the contract between the seller-side Skinner
 * builder, the database (ar_configurations.config) and the client AR engine.
 * Shared by server (validation) and client (engine).
 */

export const ANCHORS = [
  'finger', 'wrist', 'nails', 'eyes', 'ears', 'head_top', 'lips', 'neck', 'shoulder', 'torso', 'feet', 'surface',
] as const;
export type Anchor = (typeof ANCHORS)[number];

export const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;
export type Finger = (typeof FINGERS)[number];

export const NAIL_SHAPES = ['square', 'round', 'oval', 'almond', 'coffin', 'stiletto'] as const;
export const NAIL_FINISHES = ['gloss', 'matte', 'chrome', 'glitter', 'french'] as const;
export const LIP_FINISHES = ['matte', 'satin', 'gloss'] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const vec3 = z.tuple([z.number().min(-0.5).max(0.5), z.number().min(-0.5).max(0.5), z.number().min(-0.5).max(0.5)]);
const rot3 = z.tuple([z.number().min(-180).max(180), z.number().min(-180).max(180), z.number().min(-180).max(180)]);

export const nailDesignSchema = z.object({
  shape: z.enum(NAIL_SHAPES).default('almond'),
  length: z.number().min(1).max(2.4).default(1.5),
  color: hex.default('#E9A8B8'),
  finish: z.enum(NAIL_FINISHES).default('gloss'),
  tipColor: hex.default('#FFFFFF'),
  textureUrl: z.string().url().or(z.string().startsWith('/')).nullable().default(null),
});
export type NailDesign = z.infer<typeof nailDesignSchema>;

export const lipDesignSchema = z.object({
  color: hex.default('#9E3D4C'),
  opacity: z.number().min(0.1).max(0.95).default(0.6),
  finish: z.enum(LIP_FINISHES).default('satin'),
});
export type LipDesign = z.infer<typeof lipDesignSchema>;

export const arConfigSchema = z.object({
  anchor: z.enum(ANCHORS),
  finger: z.enum(FINGERS).default('ring'),
  side: z.enum(['left', 'right']).default('left'), // shoulder anchor (bag)
  transform: z.object({
    scale: z.number().min(0.1).max(10).default(1),
    position: vec3.default([0, 0, 0]),
    rotation: rot3.default([0, 0, 0]),
  }).default({ scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] }),
  /** How the 3D asset is sized: 'authored' = the GLB is modelled in metres with its origin at the anchor
   *  (SKINIFY base models). 'fit' = rescale so the chosen bounding-box axis equals fitSize metres. */
  size: z.object({
    mode: z.enum(['authored', 'fit']).default('fit'),
    fitSize: z.number().min(0.002).max(3).default(0.02),
    fitAxis: z.enum(['x', 'y', 'z', 'max']).default('max'),
    center: z.boolean().default(true),
  }).default({ mode: 'fit', fitSize: 0.02, fitAxis: 'max', center: true }),
  fitToBody: z.boolean().default(true),     // scale with measured body part size
  occlusion: z.boolean().default(true),     // hide parts behind finger / wrist / head / neck
  pair: z.boolean().default(true),          // earrings: render on both ears
  dangle: z.boolean().default(true),        // earrings / pendants: gravity-driven swing
  nails: nailDesignSchema.optional(),
  lips: lipDesignSchema.optional(),
  imagePlane: z.object({ url: z.string(), widthScale: z.number().min(0.3).max(3).default(1.3) }).optional(),
});
export type ARConfig = z.infer<typeof arConfigSchema>;

export const variantOverridesSchema = z.object({
  materials: z.record(z.string(), z.object({
    color: hex.optional(),
    metalness: z.number().min(0).max(1).optional(),
    roughness: z.number().min(0).max(1).optional(),
  })).optional(),
  nails: nailDesignSchema.partial().optional(),
  lips: lipDesignSchema.partial().optional(),
});
export type VariantOverrides = z.infer<typeof variantOverridesSchema>;

export type TrackerKind = 'hand' | 'face' | 'pose' | 'surface';
export type RenderMode = 'model' | 'nails' | 'lips' | 'image_plane';
export type Maturity = 'stable' | 'beta' | 'experimental';

export interface TrackingProfile {
  key: string;
  name: string;
  tracker: TrackerKind;
  bodyPart: 'FACE' | 'HAND' | 'FINGER' | 'WRIST' | 'HEAD' | 'BODY' | 'FEET' | 'OTHER';
  anchor: Anchor;
  renderMode: RenderMode;
  maturity: Maturity;
  description: string;
  hint: string;          // instruction shown when the body part is not in view
  defaults: Partial<ARConfig>;
}

/** Canonical tracking profiles. Seeded into `tracking_profiles`; code is the source of truth for the engine. */
export const TRACKING_PROFILES: TrackingProfile[] = [
  { key: 'finger_ring', name: 'Ring', tracker: 'hand', bodyPart: 'FINGER', anchor: 'finger', renderMode: 'model', maturity: 'stable',
    description: '21-point hand landmarks. The ring is anchored to the proximal phalanx of the chosen finger with finger occlusion.',
    hint: 'Show the back of your hand, fingers spread', defaults: { anchor: 'finger', finger: 'ring', size: { mode: 'fit', fitSize: 0.021, fitAxis: 'max', center: true } } },
  { key: 'wrist_watch', name: 'Watch', tracker: 'hand', bodyPart: 'WRIST', anchor: 'wrist', renderMode: 'model', maturity: 'stable',
    description: 'Hand landmarks give wrist position and orientation; the strap wraps an occluded wrist volume.',
    hint: 'Bring your wrist closer, back of hand to camera', defaults: { anchor: 'wrist', size: { mode: 'fit', fitSize: 0.064, fitAxis: 'x', center: true } } },
  { key: 'wrist_bracelet', name: 'Bracelet', tracker: 'hand', bodyPart: 'WRIST', anchor: 'wrist', renderMode: 'model', maturity: 'stable',
    description: 'Wrist anchor with a slightly looser fit than watches.',
    hint: 'Bring your wrist into view', defaults: { anchor: 'wrist', transform: { scale: 1, position: [0, -0.012, 0], rotation: [0, 0, 0] }, size: { mode: 'fit', fitSize: 0.066, fitAxis: 'x', center: true } } },
  { key: 'nails', name: 'Nails', tracker: 'hand', bodyPart: 'HAND', anchor: 'nails', renderMode: 'nails', maturity: 'beta',
    description: 'Per-finger nail placement from fingertip and DIP landmarks. Nails are shown only when the back of the finger faces the camera.',
    hint: 'Show the back of your hand, fingers relaxed', defaults: { anchor: 'nails', nails: { shape: 'almond', length: 1.5, color: '#E9A8B8', finish: 'gloss', tipColor: '#FFFFFF', textureUrl: null } } },
  { key: 'face_glasses', name: 'Glasses', tracker: 'face', bodyPart: 'FACE', anchor: 'eyes', renderMode: 'model', maturity: 'stable',
    description: '478-point face mesh + facial transformation matrix. Frames sit on the nose bridge; temples are occluded by the head.',
    hint: 'Look at the camera', defaults: { anchor: 'eyes', size: { mode: 'fit', fitSize: 0.138, fitAxis: 'x', center: false } } },
  { key: 'face_earrings', name: 'Earrings', tracker: 'face', bodyPart: 'FACE', anchor: 'ears', renderMode: 'model', maturity: 'beta',
    description: 'Ear-lobe positions estimated from the face mesh (the mesh does not cover ears). Earrings swing with gravity.',
    hint: 'Turn your face slightly', defaults: { anchor: 'ears', pair: true, dangle: true, size: { mode: 'fit', fitSize: 0.03, fitAxis: 'y', center: false } } },
  { key: 'face_lips', name: 'Lip colour', tracker: 'face', bodyPart: 'FACE', anchor: 'lips', renderMode: 'lips', maturity: 'stable',
    description: 'Lip contour from the face mesh, colour blended over the camera image.',
    hint: 'Face the camera', defaults: { anchor: 'lips', lips: { color: '#9E3D4C', opacity: 0.6, finish: 'satin' } } },
  { key: 'head_hat', name: 'Hat / headwear', tracker: 'face', bodyPart: 'HEAD', anchor: 'head_top', renderMode: 'model', maturity: 'beta',
    description: 'Head pose from the face mesh; hat placed over the crown with head occlusion.',
    hint: 'Move back so your whole head is in view', defaults: { anchor: 'head_top', size: { mode: 'fit', fitSize: 0.21, fitAxis: 'x', center: false } } },
  { key: 'body_necklace', name: 'Necklace', tracker: 'pose', bodyPart: 'BODY', anchor: 'neck', renderMode: 'model', maturity: 'beta',
    description: '33-point body pose. Neck anchor derived from shoulders and mouth; the back of the chain is occluded.',
    hint: 'Step back so your shoulders are visible', defaults: { anchor: 'neck', size: { mode: 'fit', fitSize: 0.14, fitAxis: 'x', center: false } } },
  { key: 'body_bag', name: 'Bag', tracker: 'pose', bodyPart: 'BODY', anchor: 'shoulder', renderMode: 'model', maturity: 'experimental',
    description: 'Shoulder anchor from body pose. Approximate placement; no cloth simulation.',
    hint: 'Step back so your upper body is visible', defaults: { anchor: 'shoulder', side: 'left', size: { mode: 'fit', fitSize: 0.36, fitAxis: 'y', center: false } } },
  { key: 'body_clothing', name: 'Clothing (2D overlay)', tracker: 'pose', bodyPart: 'BODY', anchor: 'torso', renderMode: 'image_plane', maturity: 'experimental',
    description: 'A transparent garment image aligned to shoulders and hips. Not a 3D garment simulation.',
    hint: 'Step back so shoulders and hips are visible', defaults: { anchor: 'torso' } },
  { key: 'feet_shoes', name: 'Shoes', tracker: 'pose', bodyPart: 'FEET', anchor: 'feet', renderMode: 'model', maturity: 'experimental',
    description: 'Heel / toe landmarks from full-body pose. Works when the whole body is in frame; accuracy is limited.',
    hint: 'Point the camera at your feet from a distance', defaults: { anchor: 'feet', size: { mode: 'fit', fitSize: 0.27, fitAxis: 'max', center: true } } },
  { key: 'surface_place', name: 'Place in room', tracker: 'surface', bodyPart: 'OTHER', anchor: 'surface', renderMode: 'model', maturity: 'beta',
    description: 'Free placement over the camera (drag, pinch, rotate). WebXR plane hit-testing is used on supporting Android browsers.',
    hint: 'Drag to move · pinch to resize', defaults: { anchor: 'surface', size: { mode: 'fit', fitSize: 0.3, fitAxis: 'max', center: true } } },
];

export const PROFILE_BY_KEY = Object.fromEntries(TRACKING_PROFILES.map(p => [p.key, p])) as Record<string, TrackingProfile>;

export const BODY_PARTS = [
  { key: 'FACE', label: 'Face', profiles: ['face_glasses', 'face_earrings', 'face_lips'] },
  { key: 'HAND', label: 'Hand', profiles: ['nails'] },
  { key: 'FINGER', label: 'Finger', profiles: ['finger_ring'] },
  { key: 'WRIST', label: 'Wrist', profiles: ['wrist_watch', 'wrist_bracelet'] },
  { key: 'HEAD', label: 'Head', profiles: ['head_hat'] },
  { key: 'BODY', label: 'Body', profiles: ['body_necklace', 'body_bag', 'body_clothing'] },
  { key: 'FEET', label: 'Feet', profiles: ['feet_shoes'] },
  { key: 'OTHER', label: 'Other', profiles: ['surface_place'] },
] as const;

export function buildDefaultConfig(profileKey: string, overrides: Partial<ARConfig> = {}): ARConfig {
  const p = PROFILE_BY_KEY[profileKey];
  if (!p) throw new Error('Unknown tracking profile');
  return arConfigSchema.parse({ ...p.defaults, ...overrides, anchor: p.anchor });
}
