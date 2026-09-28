// Self-host the MediaPipe WASM runtime (version-locked with the npm package, served from our CDN).
import { cpSync, existsSync, mkdirSync } from 'fs';
const src = 'node_modules/@mediapipe/tasks-vision/wasm';
const dst = 'public/mediapipe/wasm';
if (existsSync(src)) { mkdirSync(dst, { recursive: true }); cpSync(src, dst, { recursive: true }); console.log('[skinify] MediaPipe WASM copied to', dst); }
