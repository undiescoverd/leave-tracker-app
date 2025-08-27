import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/api/auth', '/api/ping', '/api/test', '/api/test-simple', '/api/health'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For now, just check if there's a session cookie
  // This prevents the async auth() call that might be causing issues
  const sessionToken = request.cookies.get('authjs.session-token') || 
                      request.cookies.get('__Secure-authjs.session-token');

  if (!sessionToken) {
    // Redirect to login if no session
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
