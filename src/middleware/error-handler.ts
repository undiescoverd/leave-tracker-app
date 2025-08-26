/**
 * Global Error Handler Middleware
 * Catches and formats all errors in API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAppError, toAppError, isOperationalError } from '@/lib/api/errors';
import { apiError } from '@/lib/api/response';

/**
 * Error logging service interface
 */
interface ErrorLogger {
  error(message: string, error: Error, context?: any): void;
  warn(message: string, context?: any): void;
}

/**
 * Simple console logger implementation
 */
class ConsoleErrorLogger implements ErrorLogger {
  error(message: string, error: Error, context?: any): void {
    console.error(`[ERROR] ${message}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
    });
  }

  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${message}`, {
      context,
      timestamp: new Date().toISOString(),
    });
  }
}

// Global error logger instance
const errorLogger = new ConsoleErrorLogger();

/**
 * Handle errors and return appropriate response
 */
export function handleError(
  error: unknown,
  request?: NextRequest
): NextResponse {
  // Convert to AppError if needed
  const appError = toAppError(error);
  
  // Log error details
  const requestContext = request ? {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  } : undefined;
  
  if (isOperationalError(error)) {
    // Log operational errors as warnings
    errorLogger.warn('Operational error occurred', {
      error: appError.toJSON(),
      request: requestContext,
    });
  } else {
    // Log unexpected errors with full details
    errorLogger.error('Unexpected error occurred', appError, {
      request: requestContext,
    });
  }
  
  // In production, hide internal error details
  if (process.env.NODE_ENV === 'production' && !appError.isOperational) {
    return apiError(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      appError.statusCode
    );
  }
  
  // Return formatted error response
  return apiError(appError.toJSON(), appError.statusCode);
}

/**
 * Async error wrapper for API route handlers
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Find NextRequest in arguments
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest | undefined;
      return handleError(error, request);
    }
  };
}

/**
 * Create an error-handled API route
 */
export function createApiRoute(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withErrorHandler(handler);
}

/**
 * Error boundary for API routes with method validation
 */
export function createMethodHandler(
  handlers: {
    GET?: (request: NextRequest, context?: any) => Promise<NextResponse>;
    POST?: (request: NextRequest, context?: any) => Promise<NextResponse>;
    PUT?: (request: NextRequest, context?: any) => Promise<NextResponse>;
    PATCH?: (request: NextRequest, context?: any) => Promise<NextResponse>;
    DELETE?: (request: NextRequest, context?: any) => Promise<NextResponse>;
  }
) {
  const allowedMethods = Object.keys(handlers);
  
  return withErrorHandler(async (request: NextRequest, context?: any) => {
    const method = request.method as keyof typeof handlers;
    
    const handler = handlers[method];
    if (!handler) {
      return apiError(
        {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${method} is not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
        },
        405
      );
    }
    
    return handler(request, context);
  });
}

/**
 * Rate limiting middleware
 */
interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;  // Custom error message
}

// Simple in-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Apply rate limiting to an API route
 */
export function withRateLimit(
  config: RateLimitConfig,
  keyGenerator?: (request: NextRequest) => string
) {
  return function <T extends any[], R>(
    handler: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R | NextResponse> {
    return async (...args: T) => {
      const request = args.find(arg => arg instanceof NextRequest) as NextRequest;
      
      if (!request) {
        return handler(...args);
      }
      
      // Generate rate limit key
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
          // Reset window
          limit.count = 1;
          limit.resetTime = now + config.windowMs;
        }
      } else {
        // First request
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
      }
      
      // Clean up old entries periodically
      if (Math.random() < 0.01) {
        for (const [k, v] of rateLimitStore.entries()) {
          if (now > v.resetTime) {
            rateLimitStore.delete(k);
          }
        }
      }
      
      return handler(...args);
    };
  };
}

/**
 * Combine multiple middleware functions
 */
export function composeMiddleware<T extends any[], R>(
  ...middlewares: Array<(handler: (...args: T) => Promise<R>) => (...args: T) => Promise<R | NextResponse>>
) {
  return (handler: (...args: T) => Promise<R>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
