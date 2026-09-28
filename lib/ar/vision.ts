/**
 * Lazy MediaPipe Tasks Vision loader. Nothing here runs until an AR session starts,
 * so discovery pages never download the ~10 MB WASM runtime or the model files.
 * All inference runs on-device; camera frames never leave the browser.
 */
import type { HandLandmarker, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

export const WASM_BASE = process.env.NEXT_PUBLIC_MEDIAPIPE_WASM_BASE || '/mediapipe/wasm';
export const MODEL_URLS = {
  hand: process.env.NEXT_PUBLIC_MP_HAND_MODEL || 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  face: process.env.NEXT_PUBLIC_MP_FACE_MODEL || 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  pose: process.env.NEXT_PUBLIC_MP_POSE_MODEL || 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
};

type Vision = typeof import('@mediapipe/tasks-vision');
let visionMod: Promise<Vision> | null = null;
let fileset: Promise<unknown> | null = null;

async function getVision() {
  if (!visionMod) visionMod = import('@mediapipe/tasks-vision');
  const v = await visionMod;
  if (!fileset) fileset = v.FilesetResolver.forVisionTasks(WASM_BASE);
  return { v, fs: (await fileset) as Parameters<typeof v.HandLandmarker.createFromOptions>[0] };
}

async function withDelegate<T>(make: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<{ task: T; delegate: 'GPU' | 'CPU' }> {
  const forceCpu = typeof navigator !== 'undefined' && /HeadlessChrome/.test(navigator.userAgent);
  if (!forceCpu) {
    try { return { task: await make('GPU'), delegate: 'GPU' }; } catch (e) { console.warn('[skinify] GPU delegate unavailable, using CPU', e); }
  }
  return { task: await make('CPU'), delegate: 'CPU' };
}

export async function createHandLandmarker(numHands = 1) {
  const { v, fs } = await getVision();
  return withDelegate<HandLandmarker>((delegate) => v.HandLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: MODEL_URLS.hand, delegate },
    runningMode: 'VIDEO', numHands,
    minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  }));
}

export async function createFaceLandmarker() {
  const { v, fs } = await getVision();
  return withDelegate<FaceLandmarker>((delegate) => v.FaceLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: MODEL_URLS.face, delegate },
    runningMode: 'VIDEO', numFaces: 1,
    outputFacialTransformationMatrixes: true, outputFaceBlendshapes: false,
    minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  }));
}

export async function createPoseLandmarker() {
  const { v, fs } = await getVision();
  return withDelegate<PoseLandmarker>((delegate) => v.PoseLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: MODEL_URLS.pose, delegate },
    runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  }));
}
