/**
 * Custom Error Classes for API
 * Provides structured error handling throughout the application
 */

import { HttpStatus, HttpStatusCode } from './response';

/**
 * Base class for all application errors
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    statusCode: HttpStatusCode,
    isOperational = true,
    details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation error for invalid request data
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: any) {
    super(
      message,
      'VALIDATION_ERROR',
      HttpStatus.UNPROCESSABLE_ENTITY,
      true,
      details
    );
  }
}

/**
 * Authentication error for unauthorized access
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(
      message,
      'AUTHENTICATION_ERROR',
      HttpStatus.UNAUTHORIZED,
      true
    );
  }
}

/**
 * Authorization error for forbidden access
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(
      message,
      'AUTHORIZATION_ERROR',
      HttpStatus.FORBIDDEN,
      true
    );
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string | number) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    
    super(
      message,
      'NOT_FOUND',
      HttpStatus.NOT_FOUND,
      true
    );
  }
}

/**
 * Conflict error for duplicate resources or conflicting operations
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: any) {
    super(
      message,
      'CONFLICT',
      HttpStatus.CONFLICT,
      true,
      details
    );
  }
}

/**
 * Bad request error for malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: any) {
    super(
      message,
      'BAD_REQUEST',
      HttpStatus.BAD_REQUEST,
      true,
      details
    );
  }
}

/**
 * Rate limit error for too many requests
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      HttpStatus.TOO_MANY_REQUESTS,
      true,
      { retryAfter }
    );
  }
}

/**
 * Database error for database-related issues
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details?: any) {
    super(
      message,
      'DATABASE_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      false,
      details
    );
  }
}

/**
 * External service error for third-party API issues
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: any) {
    super(
      message || `External service ${service} is unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      HttpStatus.BAD_GATEWAY,
      false,
      { service, ...details }
    );
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'INTERNAL_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      false
    );
  }
  
  return new AppError(
    'An unexpected error occurred',
    'INTERNAL_ERROR',
    HttpStatus.INTERNAL_SERVER_ERROR,
    false
  );
}

/**
 * Error factory for creating specific errors
 */
export const ErrorFactory = {
  validation: (message?: string, details?: any) => 
    new ValidationError(message, details),
  
  authentication: (message?: string) => 
    new AuthenticationError(message),
  
  authorization: (message?: string) => 
    new AuthorizationError(message),
  
  notFound: (resource?: string, id?: string | number) => 
    new NotFoundError(resource, id),
  
  conflict: (message?: string, details?: any) => 
    new ConflictError(message, details),
  
  badRequest: (message?: string, details?: any) => 
    new BadRequestError(message, details),
  
  rateLimit: (message?: string, retryAfter?: number) => 
    new RateLimitError(message, retryAfter),
  
  database: (message?: string, details?: any) => 
    new DatabaseError(message, details),
  
  externalService: (service: string, message?: string, details?: any) => 
    new ExternalServiceError(service, message, details),
};
