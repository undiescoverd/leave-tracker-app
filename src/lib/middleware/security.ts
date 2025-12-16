/**
 * Comprehensive Security Middleware
 * Input validation, sanitization, and security headers for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeObject, sanitizationRules } from './sanitization';
import { ValidationError, BadRequestError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { apiError } from '@/lib/api/response';

/**
 * Request validation schemas for different endpoint types
 */
export const validationSchemas = {
  leaveRequest: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().min(1, 'Reason is required').max(500),
    type: z.enum(['ANNUAL', 'TOIL', 'SICK', 'UNPAID']).optional().default('ANNUAL'),
    hours: z.number().min(0).max(168).optional(), // Max 1 week in hours
    scenario: z.string().max(100).optional(),
    coveringUserId: z.string().uuid().optional(),
  }).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  }, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  }),

  userRegistration: z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    name: z.string().min(1, 'Name is required').max(100),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  passwordReset: z.object({
    token: z.string().min(1),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  bulkOperation: z.object({
    requestIds: z.array(z.string().uuid()).min(1, 'At least one request ID required').max(100),
    reason: z.string().max(500).optional(),
  }),

  adminAction: z.object({
    action: z.enum(['approve', 'reject', 'delete']),
    reason: z.string().max(500).optional(),
  }),

  bulkLeaveRequest: z.object({
    requests: z.array(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        reason: z.string().min(1, 'Reason is required').max(500),
        type: z.enum(['ANNUAL', 'TOIL', 'SICK', 'UNPAID']).optional().default('ANNUAL'),
        hours: z.number().min(0).max(168).optional(),
      }).refine((data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }, {
        message: "End date must be after or equal to start date",
        path: ["endDate"],
      })
    ).min(1, 'At least one request required').max(50, 'Maximum 50 requests allowed'),
    type: z.enum(['ANNUAL', 'TOIL', 'SICK', 'UNPAID']).optional().default('ANNUAL'),
  }),
} as const;

/**
 * Content Security Policy configuration
 */
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // NextJS requires unsafe-inline for dev
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "https:"],
  'font-src': ["'self'", "https:"],
  'connect-src': ["'self'", "https:"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
} as const;

/**
 * Generate Content Security Policy header value
 */
function generateCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Apply comprehensive security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent content type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Restrict permissions
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSP());
  
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Prevent caching of sensitive endpoints
  if (response.url?.includes('/api/admin/') || response.url?.includes('/api/auth/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  return response;
}

/**
 * Validate and sanitize request body
 */
export async function validateAndSanitizeRequest<T extends z.ZodSchema>(
  req: NextRequest,
  schema: T,
  sanitizationRule: keyof typeof sanitizationRules = 'general'
): Promise<z.infer<T>> {
  try {
    // Parse request body
    const body = await req.json();
    
    // Sanitize input
    const sanitizedBody = sanitizeObject(body, sanitizationRules[sanitizationRule]);
    
    // Validate against schema
    const validationResult = schema.safeParse(sanitizedBody);
    
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const errorMessages = Object.entries(fieldErrors)
        .flatMap(([field, errors]) => 
          errors?.map(err => `${field}: ${err}`) || []
        );
      
      logger.securityEvent('input_validation_failure', 'low', undefined, {
        endpoint: req.nextUrl.pathname,
        errors: fieldErrors
      });
      
      throw new ValidationError(
        errorMessages.length > 0 
          ? errorMessages.join('; ')
          : 'Invalid request data',
        fieldErrors
      );
    }
    
    return validationResult.data;
    
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new BadRequestError('Invalid JSON format');
    }
    
    throw new BadRequestError('Request body parsing failed');
  }
}

/**
 * Security middleware wrapper for API routes
 */
export function withSecurity<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: {
    rateLimit?: boolean;
    validateInput?: boolean;
    schema?: z.ZodSchema;
    sanitizationRule?: keyof typeof sanitizationRules;
    logRequests?: boolean;
  } = {}
) {
  return async function securityWrapper(...args: T): Promise<NextResponse> {
    const req = args[0] as NextRequest;
    const {
      validateInput = false,
      schema,
      sanitizationRule = 'general',
      logRequests = true
    } = options;
    
    try {
      // Log incoming request
      if (logRequests) {
        logger.info('API request received', {
          action: 'api_request',
          resource: req.nextUrl.pathname,
          metadata: {
            method: req.method,
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
          }
        });
      }
      
      // Validate and sanitize input if required
      if (validateInput && schema && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const validatedData = await validateAndSanitizeRequest(req, schema, sanitizationRule);
        
        // Attach validated data to request for handler access
        (req as any).validatedData = validatedData;
      }
      
      // Call the original handler
      const response = await handler(...args);
      
      // Apply security headers to response
      return applySecurityHeaders(response);
      
    } catch (error) {
      logger.error('Security middleware error', {
        action: 'security_error',
        resource: req.nextUrl.pathname,
        metadata: {
          method: req.method,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      if (error instanceof ValidationError || error instanceof BadRequestError) {
        const response = apiError(
          {
            message: error.message,
            code: error.code,
            details: error.details,
          },
          error.statusCode as any
        );
        return applySecurityHeaders(response);
      }
      
      const response = NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
      return applySecurityHeaders(response);
    }
  };
}

/**
 * CSRF protection for state-changing operations
 */
export function validateCSRF(req: NextRequest): boolean {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }
  
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  
  // Validate origin header
  if (origin) {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      logger.securityEvent('csrf_violation', 'high', undefined, {
        endpoint: req.nextUrl.pathname,
        origin,
        host,
        referer
      });
      return false;
    }
  }
  
  // Validate referer header as fallback
  if (!origin && referer) {
    const refererUrl = new URL(referer);
    if (refererUrl.host !== host) {
      logger.securityEvent('csrf_violation', 'high', undefined, {
        endpoint: req.nextUrl.pathname,
        referer,
        host
      });
      return false;
    }
  }
  
  return true;
}

/**
 * Input size limits to prevent DoS attacks
 */
export const INPUT_LIMITS = {
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  MAX_QUERY_PARAMS: 50,
  MAX_PARAM_LENGTH: 1000,
} as const;

/**
 * Validate request size and structure
 */
export function validateRequestLimits(req: NextRequest): boolean {
  // Check query parameter limits
  const searchParams = req.nextUrl.searchParams;
  
  if (searchParams.size > INPUT_LIMITS.MAX_QUERY_PARAMS) {
    logger.securityEvent('request_limit_exceeded', 'medium', undefined, {
      endpoint: req.nextUrl.pathname,
      queryParamCount: searchParams.size,
      limit: INPUT_LIMITS.MAX_QUERY_PARAMS
    });
    return false;
  }
  
  // Check individual parameter lengths
  for (const [key, value] of searchParams.entries()) {
    if (key.length > INPUT_LIMITS.MAX_PARAM_LENGTH || value.length > INPUT_LIMITS.MAX_PARAM_LENGTH) {
      logger.securityEvent('request_limit_exceeded', 'medium', undefined, {
        endpoint: req.nextUrl.pathname,
        parameterKey: key,
        parameterLength: Math.max(key.length, value.length),
        limit: INPUT_LIMITS.MAX_PARAM_LENGTH
      });
      return false;
    }
  }
  
  return true;
}

/**
 * Complete security middleware that combines all protections
 */
export function withCompleteSecurity<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: {
    validateInput?: boolean;
    schema?: z.ZodSchema;
    sanitizationRule?: keyof typeof sanitizationRules;
    skipCSRF?: boolean;
  } = {}
) {
  return withSecurity(handler, {
    ...options,
    logRequests: true,
  });
}