import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class HttpError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
export function json(data: unknown, init?: number | ResponseInit) { return NextResponse.json(data, typeof init === 'number' ? { status: init } : init); }
export function handle<T extends unknown[]>(fn: (...a: T) => Promise<Response>) {
  return async (...a: T) => {
    try { return await fn(...a); } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
      if (e instanceof ZodError) return json({ error: 'Invalid input', issues: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, 422);
      console.error('[api]', e); return json({ error: 'Something went wrong' }, 500);
    }
  };
}
/** CSRF defence for cookie-authenticated mutations: require same-origin Origin/Referer. */
export function assertSameOrigin(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  const origin = req.headers.get('origin') || req.headers.get('referer');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) throw new HttpError(403, 'Missing origin');
  try { if (new URL(origin).host !== host) throw new HttpError(403, 'Cross-origin request blocked'); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(403, 'Bad origin'); }
}
