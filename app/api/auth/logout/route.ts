import { json, handle, assertSameOrigin } from '@/lib/server/http';
import { destroySession } from '@/lib/server/auth';
export const POST = handle(async (req: Request) => { assertSameOrigin(req); await destroySession(); return json({ ok: true }); });
