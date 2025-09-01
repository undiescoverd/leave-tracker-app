/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

import { NextResponse } from 'next/server';
import { apiSuccess, apiError, ApiResponse, HttpStatus } from './response';
import { AppError, isAppError } from './errors';
import { logger } from '../logger';

/**
 * Standard success responses for common operations
 */
export const StandardResponses = {
  // CRUD Operations
  created: <T>(data: T, message = 'Resource created successfully') =>
    apiSuccess({ ...data, message }, undefined, HttpStatus.CREATED),
  
  updated: <T>(data: T, message = 'Resource updated successfully') =>
    apiSuccess({ ...data, message }),
  
  deleted: (message = 'Resource deleted successfully') =>
    apiSuccess({ message }, undefined, HttpStatus.NO_CONTENT),
  
  // Data retrieval
  found: <T>(data: T, total?: number) => {
    const response = Array.isArray(data) 
      ? { items: data, count: data.length, total: total ?? data.length }
      : data;
    return apiSuccess(response);
  },
  
  // Authentication responses
  authenticated: (user: any, token?: string) =>
    apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...(token && { token }),
      message: 'Authentication successful',
    }),
  
  // Operation confirmations
  processed: (operation: string, details?: any) =>
    apiSuccess({
      operation,
      status: 'completed',
      details,
      message: `${operation} completed successfully`,
    }),
};

/**
 * Enhanced error response with context and suggestions
 */
export function createContextualErrorResponse(
  error: unknown,
  context: {
    operation: string;
    resource: string;
    userId?: string;
  }
): NextResponse<ApiResponse> {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (isAppError(error)) {
    // Log operational errors as warnings, programming errors as errors
    const logLevel = error.isOperational ? 'warn' : 'error';
    logger[logLevel](`API Error: ${error.message}`, {
      action: 'api_error',
      resource: context.resource,
      userId: context.userId,
      metadata: {
        operation: context.operation,
        errorId,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      }
    }, error);

    return apiError({
      code: error.code,
      message: error.message,
      details: error.details,
      errorId,
      context: {
        operation: context.operation,
        resource: context.resource,
      },
      suggestions: getSuggestions(error),
    }, error.statusCode as any);
  }
  
  // Handle unexpected errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  logger.error(`Unexpected API Error: ${message}`, {
    action: 'api_error',
    resource: context.resource,
    userId: context.userId,
    metadata: {
      operation: context.operation,
      errorId,
      type: 'unexpected',
    }
  }, error instanceof Error ? error : new Error(String(error)));

  return apiError({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    errorId,
    context: {
      operation: context.operation,
      resource: context.resource,
    },
    suggestions: ['Please try again later', 'Contact support if the problem persists'],
  }, HttpStatus.INTERNAL_SERVER_ERROR);
}

/**
 * Generate user-friendly suggestions based on error type
 */
function getSuggestions(error: AppError): string[] {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return [
        'Check that all required fields are provided',
        'Ensure data formats match the expected types',
        'Review the API documentation for field requirements',
      ];
    
    case 'AUTHENTICATION_ERROR':
      return [
        'Log in again to refresh your session',
        'Check that your credentials are correct',
        'Clear browser cache and cookies if issues persist',
      ];
    
    case 'AUTHORIZATION_ERROR':
      return [
        'Contact an administrator for the required permissions',
        'Ensure you are logged in with the correct account',
        'Check if your account has been deactivated',
      ];
    
    case 'NOT_FOUND_ERROR':
      return [
        'Verify the resource ID is correct',
        'Check if the resource has been deleted',
        'Ensure you have permission to access this resource',
      ];
    
    case 'CONFLICT_ERROR':
      return [
        'Check for conflicting data or constraints',
        'Refresh the page to get the latest data',
        'Try a different approach or timing',
      ];
    
    case 'RATE_LIMIT_ERROR':
      return [
        'Wait a moment before trying again',
        'Reduce the frequency of your requests',
        'Contact support if you need higher rate limits',
      ];
    
    case 'DATABASE_ERROR':
      return [
        'Try again in a few moments',
        'Contact support if the issue continues',
        'Check your network connection',
      ];
    
    default:
      return [
        'Try again in a few moments',
        'Contact support if the problem persists',
        'Check the system status page',
      ];
  }
}

/**
 * Wrapper for API handlers with standardized error handling
 */
export function withStandardizedResponses<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse> | NextResponse,
  context: {
    operation: string;
    resource: string;
  }
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract user ID from request if available
      const request = args[0] as any;
      const userId = request?.headers?.get('user-id') || 
                    request?.user?.id || 
                    undefined;

      return createContextualErrorResponse(error, {
        ...context,
        userId,
      });
    }
  };
}

/**
 * Validation response helpers
 */
export const ValidationResponses = {
  invalidRequest: (field: string, reason?: string) =>
    apiError({
      code: 'VALIDATION_ERROR',
      message: `Invalid ${field}${reason ? `: ${reason}` : ''}`,
      details: { field, reason },
      suggestions: getSuggestions({ code: 'VALIDATION_ERROR' } as AppError),
    }, HttpStatus.UNPROCESSABLE_ENTITY),
  
  missingRequired: (fields: string[]) =>
    apiError({
      code: 'VALIDATION_ERROR',
      message: `Missing required fields: ${fields.join(', ')}`,
      details: { missingFields: fields },
      suggestions: getSuggestions({ code: 'VALIDATION_ERROR' } as AppError),
    }, HttpStatus.UNPROCESSABLE_ENTITY),
  
  invalidFormat: (field: string, expectedFormat: string) =>
    apiError({
      code: 'VALIDATION_ERROR',
      message: `Invalid format for ${field}. Expected: ${expectedFormat}`,
      details: { field, expectedFormat },
      suggestions: getSuggestions({ code: 'VALIDATION_ERROR' } as AppError),
    }, HttpStatus.UNPROCESSABLE_ENTITY),
};

/**
 * Permission response helpers
 */
export const PermissionResponses = {
  unauthorized: (action: string) =>
    apiError({
      code: 'AUTHORIZATION_ERROR',
      message: `You don't have permission to ${action}`,
      suggestions: getSuggestions({ code: 'AUTHORIZATION_ERROR' } as AppError),
    }, HttpStatus.FORBIDDEN),
  
  adminRequired: () =>
    apiError({
      code: 'AUTHORIZATION_ERROR',
      message: 'Administrator privileges required for this operation',
      suggestions: getSuggestions({ code: 'AUTHORIZATION_ERROR' } as AppError),
    }, HttpStatus.FORBIDDEN),
  
  loginRequired: () =>
    apiError({
      code: 'AUTHENTICATION_ERROR',
      message: 'You must be logged in to access this resource',
      suggestions: getSuggestions({ code: 'AUTHENTICATION_ERROR' } as AppError),
    }, HttpStatus.UNAUTHORIZED),
};

/**
 * Business logic response helpers
 */
export const BusinessResponses = {
  insufficientBalance: (current: number, required: number) =>
    apiError({
      code: 'BUSINESS_RULE_ERROR',
      message: `Insufficient leave balance. Current: ${current}, Required: ${required}`,
      details: { currentBalance: current, requiredBalance: required },
      suggestions: [
        'Check your current leave balance',
        'Request fewer days',
        'Contact HR for balance adjustments',
      ],
    }, HttpStatus.UNPROCESSABLE_ENTITY),
  
  dateConflict: (conflictingDates: string[]) =>
    apiError({
      code: 'BUSINESS_RULE_ERROR',
      message: 'The requested dates conflict with existing bookings',
      details: { conflictingDates },
      suggestions: [
        'Choose different dates',
        'Check the team calendar for availability',
        'Contact your manager for exceptions',
      ],
    }, HttpStatus.CONFLICT),
  
  operationNotAllowed: (reason: string) =>
    apiError({
      code: 'BUSINESS_RULE_ERROR',
      message: `Operation not allowed: ${reason}`,
      details: { reason },
      suggestions: [
        'Review the business rules',
        'Contact support for clarification',
        'Try a different approach',
      ],
    }, HttpStatus.UNPROCESSABLE_ENTITY),
};