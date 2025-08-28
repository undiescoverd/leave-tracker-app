/**
 * Error handling middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api/response';

/**
 * HTTP Status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Error types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Authentication middleware
 */
export function withAuth(handler: any) {
  return async (request: NextRequest, context: any) => {
    // Check for authentication header or session
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        401
      );
    }
    
    return handler(request, context);
  };
}

/**
 * Role-based authorization middleware
 */
export function withRole(requiredRole: string, handler: any) {
  return async (request: NextRequest, context: any) => {
    // This would check the user's role from the session/token
    // For now, we'll just pass through
    return handler(request, context);
  };
}

/**
 * Validation middleware
 */
export function withValidation(schema: any, handler: any) {
  return async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      
      // Add validated data to request
      (request as any).validatedData = validatedData;
      
      return handler(request, context);
    } catch (error: any) {
      return apiError(
        {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.errors || error.message,
        },
        422
      );
    }
  };
}

/**
 * CORS middleware
 */
export function withCORS(handler: any) {
  return async (request: NextRequest, context: any) => {
    const response = await handler(request, context);
    
    if (response instanceof NextResponse) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    return response;
  };
}

/**
 * Method validation middleware
 */
export function withMethod(allowedMethods: string[], handler: any) {
  return async (request: NextRequest, context: any) => {
    const method = request.method.toUpperCase();
    
    if (!allowedMethods.includes(method)) {
      return apiError(
        {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${method} is not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
        },
        405
      );
    }
    
    return handler(request, context);
  };
}

/**
 * Rate limiting middleware
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(config: RateLimitConfig, keyGenerator?: (request: NextRequest) => string) {
  return (handler: any) => {
    return async (request: NextRequest, context: any) => {
      const key = keyGenerator 
        ? keyGenerator(request)
        : request.headers.get('x-forwarded-for') || 'anonymous';
      
      const now = Date.now();
      const limit = rateLimitStore.get(key);
      
      if (limit) {
        if (now < limit.resetTime) {
          if (limit.count >= config.max) {
            const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
            return apiError(
              {
                code: 'RATE_LIMIT_EXCEEDED',
                message: config.message || 'Too many requests',
                details: { retryAfter },
              },
              429
            );
          }
          limit.count++;
        } else {
          limit.count = 1;
          limit.resetTime = now + config.windowMs;
        }
      } else {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
      }
      
      return handler(request, context);
    };
  };
}

/**
 * Combine multiple middleware functions
 */
export function composeMiddleware(...middlewares: any[]) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
