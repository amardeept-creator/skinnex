import { json, handle } from '@/lib/server/http';
import { getUser, GUEST_USER } from '@/lib/server/auth';
export const GET = handle(async () => {
  const u = (await getUser()) || GUEST_USER;
  return json({ id: u.id, name: u.name, email: u.email, sellerId: u.sellerId, isAdmin: u.isAdmin });
});
