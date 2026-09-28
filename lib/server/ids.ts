import { randomBytes, createHash } from 'crypto';
const ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789'; // no ambiguous chars
export function shortId(n = 8) { const b = randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += ALPHA[b[i] % ALPHA.length]; return s; }
export function token(bytes = 32) { return randomBytes(bytes).toString('base64url'); }
export function sha256(s: string) { return createHash('sha256').update(s).digest('hex'); }
export function slugify(s: string, max = 48) {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'item';
}
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
