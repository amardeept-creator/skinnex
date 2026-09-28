import { json, handle } from '@/lib/server/http';
import { getUser } from '@/lib/server/auth';
export const GET = handle(async () => { const u = await getUser(); return json(u ? { id: u.id, name: u.name, email: u.email, sellerId: u.sellerId, isAdmin: u.isAdmin } : null); });
