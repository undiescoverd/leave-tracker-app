/**
 * Request Validation Utilities
 * Provides Zod-based validation for API requests
 */

import { z, ZodError, ZodSchema } from 'zod';
import { NextRequest } from 'next/server';
import { ValidationError } from './errors';

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * Format Zod errors for API responses
 */
export function formatZodError(error: ZodError): Record<string, any> {
  const formatted: Record<string, any> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });
  
  return formatted;
}

/**
 * Validate request body against a schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: new ValidationError(
          'Request body validation failed',
          formatZodError(error)
        ),
      };
    }
    
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: new ValidationError('Invalid JSON in request body'),
      };
    }
    
    return {
      success: false,
      error: new ValidationError('Failed to validate request body'),
    };
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, any> = {};
    
    searchParams.forEach((value, key) => {
      // Handle array parameters (e.g., ?id=1&id=2)
      if (params[key]) {
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    });
    
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: new ValidationError(
          'Query parameter validation failed',
          formatZodError(error)
        ),
      };
    }
    
    return {
      success: false,
      error: new ValidationError('Failed to validate query parameters'),
    };
  }
}

/**
 * Validate route parameters against a schema
 */
export function validateParams<T>(
  params: any,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: new ValidationError(
          'Route parameter validation failed',
          formatZodError(error)
        ),
      };
    }
    
    return {
      success: false,
      error: new ValidationError('Failed to validate route parameters'),
    };
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * Pagination query parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
  
  /**
   * ID parameter (numeric)
   */
  numericId: z.object({
    id: z.coerce.number().int().positive(),
  }),
  
  /**
   * ID parameter (string/UUID)
   */
  stringId: z.object({
    id: z.string().min(1),
  }),
  
  /**
   * Date range query
   */
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }),
  
  /**
   * Search query
   */
  search: z.object({
    q: z.string().min(1).max(100),
    fields: z.array(z.string()).optional(),
  }),
};

/**
 * Leave request specific schemas
 */
export const LeaveSchemas = {
  /**
   * Create leave request
   */
  createRequest: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().min(1).max(500),
    type: z.enum(['ANNUAL', 'SICK', 'UNPAID']).default('ANNUAL'),
  }).refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }),
  
  /**
   * Update leave request
   */
  updateRequest: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    reason: z.string().min(1).max(500).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
  
  /**
   * Approve/Reject leave request
   */
  reviewRequest: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().min(1).max(500).optional(),
  }),
  
  /**
   * Filter leave requests
   */
  filterRequests: z.object({
    userId: z.string().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

/**
 * User management schemas
 */
export const UserSchemas = {
  /**
   * Create user
   */
  createUser: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
    role: z.enum(['USER', 'ADMIN']).default('USER'),
    password: z.string().min(8).max(100),
  }),
  
  /**
   * Update user
   */
  updateUser: z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).max(100).optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
  }),
  
  /**
   * Change password
   */
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

/**
 * Create a validated API handler
 */
export function createValidatedHandler<TBody = any, TQuery = any, TParams = any>(
  config: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
  },
  handler: (
    request: NextRequest,
    context: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    }
  ) => Promise<Response>
) {
  return async (request: NextRequest, props: { params?: any }) => {
    const context: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    } = {};
    
    // Validate body if schema provided
    if (config.body) {
      const bodyResult = await validateBody(request, config.body);
      if (!bodyResult.success) {
        throw bodyResult.error;
      }
      context.body = bodyResult.data;
    }
    
    // Validate query if schema provided
    if (config.query) {
      const queryResult = validateQuery(request, config.query);
      if (!queryResult.success) {
        throw queryResult.error;
      }
      context.query = queryResult.data;
    }
    
    // Validate params if schema provided
    if (config.params && props.params) {
      const paramsResult = validateParams(props.params, config.params);
      if (!paramsResult.success) {
        throw paramsResult.error;
      }
      context.params = paramsResult.data;
    }
    
    return handler(request, context);
  };
}
