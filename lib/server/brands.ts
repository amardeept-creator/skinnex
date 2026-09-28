import 'server-only';
import { z } from 'zod';
import { sql } from './db';
import { HttpError } from './http';

export const brandInput = z.object({
  name: z.string().trim().min(2, 'Brand name is required').max(60),
  tagline: z.string().trim().max(120).default(''),
  description: z.string().trim().max(2000).default(''),
  website: z.string().trim().max(300).refine(v => !v || /^https?:\/\/[^\s]+$/i.test(v), 'Website must start with https://').default(''),
  logoUrl: z.string().max(500).nullable().default(null),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6E4CF5'),
  instagram: z.string().trim().max(60).default(''),
});
export async function checkLogo(sellerId: string, url: string | null) {
  if (!url) return;
  const [a] = await sql`select 1 from ar_assets where url = ${url} and seller_id = ${sellerId} and kind = 'image' and status = 'ready'`;
  if (!a) throw new HttpError(400, 'Logo must be uploaded through SKINIFY');
}

