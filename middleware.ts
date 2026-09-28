import { NextResponse, type NextRequest } from 'next/server';
// Cheap edge gate: bounce anonymous users away from private areas. Real authorisation happens server-side per request.
export function middleware(req: NextRequest) {
  const has = req.cookies.get('skn_session');
  if (!has) { const u = req.nextUrl.clone(); u.pathname = '/login'; u.searchParams.set('next', req.nextUrl.pathname); return NextResponse.redirect(u); }
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/admin/:path*', '/onboarding/:path*'] };
