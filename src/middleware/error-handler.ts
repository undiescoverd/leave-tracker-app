/**
 * Centralized error handling middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiError, ApiError as ApiErrorType, HttpStatus as ApiHttpStatus } from '@/lib/api/response';
import { AppError, isAppError, isOperationalError } from '@/lib/api/errors';
import { logger, generateRequestId } from '@/lib/logger';

/**
 * HTTP Status codes for middleware
 */
export const MiddlewareHttpStatus = {
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
 * Error interface for middleware
 */
export interface MiddlewareApiError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
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
 * Global error handler wrapper for API routes
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const requestId = generateRequestId();
    const startTime = performance.now();
    
    try {
      // Add request ID to headers for tracking
      if (request.headers) {
        request.headers.set('x-request-id', requestId);
      }

      // Log API request
      logger.apiRequest(
        request.method,
        request.nextUrl.pathname,
        request.headers.get('user-id') || undefined,
        requestId
      );

      const result = await handler(...args);
      
      // Log successful response
      const duration = performance.now() - startTime;
      logger.apiResponse(
        request.method,
        request.nextUrl.pathname,
        200,
        duration,
        request.headers.get('user-id') || undefined,
        requestId
      );

      return result;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Handle different types of errors
      let statusCode: number = MiddlewareHttpStatus.INTERNAL_SERVER_ERROR;
      let errorResponse: MiddlewareApiError;
      
      if (isAppError(error)) {
        statusCode = error.statusCode;
        errorResponse = {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        };
        
        // Log operational vs programming errors differently
        if (isOperationalError(error)) {
          logger.warn(`Operational error: ${error.message}`, {
            requestId,
            action: 'api_error',
            resource: `${request.method} ${request.nextUrl.pathname}`,
            metadata: {
              code: error.code,
              statusCode: error.statusCode,
              details: error.details,
            }
          });
        } else {
          logger.error(`Programming error: ${error.message}`, {
            requestId,
            action: 'api_error',
            resource: `${request.method} ${request.nextUrl.pathname}`,
            metadata: {
              code: error.code,
              statusCode: error.statusCode,
            }
          }, error);
        }
      } else {
        // Handle unexpected errors
        errorResponse = {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        };
        
        logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`, {
          requestId,
          action: 'api_error',
          resource: `${request.method} ${request.nextUrl.pathname}`,
          metadata: {
            type: 'unexpected',
          }
        }, error instanceof Error ? error : new Error(String(error)));
      }
      
      // Log error response
      logger.apiResponse(
        request.method,
        request.nextUrl.pathname,
        statusCode,
        duration,
        request.headers.get('user-id') || undefined,
        requestId
      );
      
      return apiError(errorResponse, statusCode as any);
    }
  };
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse,
  operationName?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const operation = operationName || `${request.method} ${request.nextUrl.pathname}`;
    const startTime = performance.now();
    
    try {
      const result = await handler(...args);
      const duration = performance.now() - startTime;
      
      logger.performanceMetric(operation, duration, {
        method: request.method,
        path: request.nextUrl.pathname,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.performanceMetric(operation, duration, {
        method: request.method,
        path: request.nextUrl.pathname,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };
}

/**
 * Database query optimization wrapper
 */
export function withQueryOptimization<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse
) {
  return async (...args: T): Promise<NextResponse> => {
    // Start query monitoring
    const queryStartTime = performance.now();
    const queryCount = 0;
    
    // This would integrate with Prisma middleware in a real implementation
    // For now, we'll track performance metrics
    
    try {
      const result = await handler(...args);
      const totalDuration = performance.now() - queryStartTime;
      
      // Log if queries are taking too long or if there are many queries
      if (totalDuration > 1000 || queryCount > 10) {
        const request = args[0] as NextRequest;
        logger.warn('Slow database operations detected', {
          action: 'performance_warning',
          resource: `${request.method} ${request.nextUrl.pathname}`,
          metadata: {
            totalDuration: `${totalDuration}ms`,
            queryCount,
            threshold: 'exceeded',
          }
        });
      }
      
      return result;
    } catch (error) {
      throw error;
    }
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
