/**
 * API Response Utility
 * Standardized response format for all API endpoints
 */

import { NextResponse } from 'next/server';

/**
 * Standard API Response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

/**
 * API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}

/**
 * API Metadata
 */
export interface ApiMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * HTTP Status codes used in the application
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  meta?: Partial<ApiMeta>,
  status: HttpStatusCode = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      ...meta,
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function apiError(
  error: string | ApiError,
  status: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: any
): NextResponse<ApiResponse> {
  const errorObject: ApiError = typeof error === 'string'
    ? {
        code: `ERROR_${status}`,
        message: error,
        details,
        timestamp: new Date().toISOString(),
      }
    : {
        ...error,
        timestamp: error.timestamp || new Date().toISOString(),
      };

  const response: ApiResponse = {
    success: false,
    error: errorObject,
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated API response
 */
export function apiPaginated<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  meta?: Partial<ApiMeta>
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  const paginationMeta: PaginationMeta = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrevious: pagination.page > 1,
  };

  return apiSuccess(data, {
    ...meta,
    pagination: paginationMeta,
  });
}

/**
 * Standard error responses
 */
export const StandardErrors = {
  UNAUTHORIZED: () => apiError(
    {
      code: 'UNAUTHORIZED',
      message: 'Authentication required to access this resource',
    },
    HttpStatus.UNAUTHORIZED
  ),
  
  FORBIDDEN: () => apiError(
    {
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    },
    HttpStatus.FORBIDDEN
  ),
  
  NOT_FOUND: (resource = 'Resource') => apiError(
    {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    },
    HttpStatus.NOT_FOUND
  ),
  
  VALIDATION_ERROR: (details: any) => apiError(
    {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
    },
    HttpStatus.UNPROCESSABLE_ENTITY
  ),
  
  INTERNAL_ERROR: (message = 'An unexpected error occurred') => apiError(
    {
      code: 'INTERNAL_ERROR',
      message,
    },
    HttpStatus.INTERNAL_SERVER_ERROR
  ),
  
  METHOD_NOT_ALLOWED: (method: string, allowed: string[]) => apiError(
    {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} is not allowed. Allowed methods: ${allowed.join(', ')}`,
    },
    HttpStatus.METHOD_NOT_ALLOWED
  ),
  
  RATE_LIMIT_EXCEEDED: () => apiError(
    {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
    HttpStatus.TOO_MANY_REQUESTS
  ),
};
