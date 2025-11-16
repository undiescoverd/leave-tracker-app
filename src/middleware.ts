import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/login', 
  '/register', 
  '/forgot-password', 
  '/reset-password', 
  '/api/auth', 
  '/api/ping', 
  '/api/test', 
  '/api/test-simple', 
  '/api/health'
];

// Define admin-only routes for additional logging
const adminRoutes = [
  '/admin',
  '/api/admin'
];

// Simple security headers function
function applyBasicSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// Simple CSRF validation
function validateCSRF(request: NextRequest): boolean {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Basic origin validation
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }
  
  return true;
}

// Simple request limits validation
function validateRequestLimits(request: NextRequest): boolean {
  const searchParams = request.nextUrl.searchParams;
  
  // Check query parameter limits
  if (searchParams.size > 50) {
    return false;
  }
  
  // Check individual parameter lengths
  for (const [key, value] of searchParams.entries()) {
    if (key.length > 1000 || value.length > 1000) {
      return false;
    }
  }
  
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Apply request size and structure validation
    if (!validateRequestLimits(request)) {
      const response = NextResponse.json(
        { error: 'Request limits exceeded', code: 'REQUEST_LIMIT_ERROR' },
        { status: 400 }
      );
      return applyBasicSecurityHeaders(response);
    }

    // Apply CSRF protection for state-changing operations
    if (!validateCSRF(request)) {
      const response = NextResponse.json(
        { error: 'CSRF validation failed', code: 'CSRF_ERROR' },
        { status: 403 }
      );
      return applyBasicSecurityHeaders(response);
    }

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      const response = NextResponse.next();
      return applyBasicSecurityHeaders(response);
    }

    // Check for session token (lightweight auth check)
    const sessionToken = request.cookies.get('authjs.session-token') || 
                        request.cookies.get('__Secure-authjs.session-token');

    if (!sessionToken) {
      // Redirect to login if no session
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(loginUrl);
      return applyBasicSecurityHeaders(response);
    }

    const response = NextResponse.next();
    return applyBasicSecurityHeaders(response);

  } catch (error) {
    const response = NextResponse.json(
      { error: 'Middleware error', code: 'MIDDLEWARE_ERROR' },
      { status: 500 }
    );
    return applyBasicSecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};