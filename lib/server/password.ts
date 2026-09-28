import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(scrypt) as (p: string, s: Buffer, k: number, o: object) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export async function hashPassword(pw: string) {
  const salt = randomBytes(16); const key = await scryptAsync(pw, salt, 64, PARAMS);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [alg, s, k] = stored.split('$'); if (alg !== 'scrypt' || !s || !k) return false;
  const key = await scryptAsync(pw, Buffer.from(s, 'base64'), 64, PARAMS); const exp = Buffer.from(k, 'base64');
  return exp.length === key.length && timingSafeEqual(exp, key);
}
