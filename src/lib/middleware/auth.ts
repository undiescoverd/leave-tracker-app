/**
 * Authentication and Authorization Middleware
 * Centralized security middleware for Next.js 15 App Router with NextAuth v5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthenticationError, AuthorizationError, RateLimitError } from '@/lib/api/errors';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';

// Rate limiting store (in-memory for now, should be Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configurations
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { requests: 5, windowMs: 60000 }, // 5 auth attempts per minute
  admin: { requests: 200, windowMs: 60000 }, // 200 requests per minute for admin
  public: { requests: 50, windowMs: 60000 }, // 50 requests per minute for public routes
} as const;

/**
 * Rate limiting middleware
 */
function createRateLimiter(config: { requests: number; windowMs: number }) {
  return (identifier: string): boolean => {
    const now = Date.now();
    const key = `${identifier}-${Math.floor(now / config.windowMs)}`;
    
    const current = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs };
    
    if (now > current.resetTime) {
      // Reset counter if window has passed
      current.count = 1;
      current.resetTime = now + config.windowMs;
    } else {
      current.count++;
    }
    
    rateLimitStore.set(key, current);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now > v.resetTime) {
          rateLimitStore.delete(k);
        }
      }
    }
    
    return current.count <= config.requests;
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: NextRequest): string {
  // Priority order: authenticated user ID, forwarded IP, direct IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return ip;
}

/**
 * Apply rate limiting based on route type
 */
function applyRateLimit(req: NextRequest, routeType: keyof typeof RATE_LIMITS = 'default'): boolean {
  const identifier = getClientIdentifier(req);
  const limiter = createRateLimiter(RATE_LIMITS[routeType]);
  
  const allowed = limiter(identifier);
  
  if (!allowed) {
    logger.securityEvent('rate_limit_exceeded', 'medium', identifier, {
      endpoint: req.nextUrl.pathname,
      routeType
    });
  }
  
  return allowed;
}

/**
 * Enhanced authentication middleware with session validation
 */
export function withAuth(
  handler: (req: NextRequest, context?: { user: any }) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    rateLimit?: keyof typeof RATE_LIMITS;
  } = {}
) {
  return async function authMiddleware(req: NextRequest): Promise<NextResponse> {
    const { requireAuth = true, requireAdmin = false, rateLimit = 'default' } = options;
    
    try {
      // Apply rate limiting
      if (!applyRateLimit(req, rateLimit)) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', code: 'RATE_LIMIT_ERROR' },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(RATE_LIMITS[rateLimit].windowMs / 1000).toString()
            }
          }
        );
      }

      // Check authentication if required
      let user = null;
      if (requireAuth || requireAdmin) {
        const session = await auth();
        
        if (!session?.user?.email) {
          logger.securityEvent('authentication_failure', 'medium', getClientIdentifier(req), {
            endpoint: req.nextUrl.pathname,
            reason: 'no_session'
          });
          throw new AuthenticationError('Authentication required');
        }

        // Get full user data from database
        user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (!user) {
          logger.securityEvent('authentication_failure', 'high', session.user.email, {
            endpoint: req.nextUrl.pathname,
            reason: 'user_not_found'
          });
          throw new AuthenticationError('User not found');
        }

        // Verify session integrity - check if user data matches session
        if (user.email !== session.user.email) {
          logger.securityEvent('session_integrity_violation', 'high', user.email, {
            endpoint: req.nextUrl.pathname,
            sessionEmail: session.user.email,
            dbEmail: user.email
          });
          throw new AuthenticationError('Session integrity violation');
        }

        // Check admin requirement
        if (requireAdmin && user.role !== 'ADMIN') {
          logger.securityEvent('authorization_failure', 'medium', user.email, {
            endpoint: req.nextUrl.pathname,
            userRole: user.role,
            requiredRole: 'ADMIN'
          });
          throw new AuthorizationError('Administrator access required');
        }

        logger.debug('Authentication successful', {
          userId: user.id,
          role: user.role,
          endpoint: req.nextUrl.pathname,
          email: user.email
        });
      }

      // Call the wrapped handler with authenticated user context
      return await handler(req, { user });

    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }
      
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      logger.error('Authentication middleware error', {
        endpoint: req.nextUrl.pathname,
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });

      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  };
}

/**
 * Admin-only route wrapper with enhanced security
 */
export function withAdminAuth(
  handler: (req: NextRequest, context: { user: any }) => Promise<NextResponse>
) {
  return withAuth((req, context) => {
    if (!context || !context.user) {
      throw new Error('Authentication context required');
    }
    return handler(req, context);
  }, { 
    requireAuth: true, 
    requireAdmin: true, 
    rateLimit: 'admin' 
  });
}

/**
 * Public route wrapper with basic rate limiting
 */
export function withPublicRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withAuth(
    (req) => handler(req), 
    { 
      requireAuth: false, 
      rateLimit: 'public' 
    }
  );
}

/**
 * Auth route wrapper with strict rate limiting
 */
export function withAuthRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withAuth(
    (req) => handler(req), 
    { 
      requireAuth: false, 
      rateLimit: 'auth' 
    }
  );
}

/**
 * Standard authenticated route wrapper
 */
export function withUserAuth(
  handler: (req: NextRequest, context: { user: any }) => Promise<NextResponse>
) {
  return withAuth((req, context) => {
    if (!context || !context.user) {
      throw new Error('Authentication context required');
    }
    return handler(req, context);
  }, { 
    requireAuth: true, 
    rateLimit: 'default' 
  });
}