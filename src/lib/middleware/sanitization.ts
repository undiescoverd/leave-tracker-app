import { NextRequest } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';

// Sanitization options for different contexts
const sanitizeOptions = {
  // For text content that should not contain HTML
  text: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // For content that may contain safe HTML (comments, descriptions)
  html: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  // For URLs
  url: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: false,
  }
};

/**
 * Sanitizes a string value based on the specified type
 */
export function sanitizeString(value: string, type: 'text' | 'html' | 'url' = 'text'): string {
  if (typeof value !== 'string') {
    return '';
  }
  
  // Trim whitespace
  value = value.trim();
  
  if (type === 'url') {
    // Additional URL validation
    try {
      const url = new URL(value);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
    } catch {
      return '';
    }
  }
  
  return DOMPurify.sanitize(value, sanitizeOptions[type]);
}

/**
 * Recursively sanitizes an object's string values
 */
export function sanitizeObject(obj: any, rules: Record<string, 'text' | 'html' | 'url'> = {}): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, 'text');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, rules));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizationType = rules[key] || 'text';
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, sanitizationType);
      } else if (typeof value === 'object' || Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value, rules);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware function to sanitize request body
 */
export function createSanitizationMiddleware(rules: Record<string, 'text' | 'html' | 'url'> = {}) {
  return async function sanitizeRequestBody(req: NextRequest) {
    try {
      const body = await req.json();
      const sanitizedBody = sanitizeObject(body, rules);
      
      // Create a new request with sanitized body
      return new NextRequest(req.url, {
        ...req,
        body: JSON.stringify(sanitizedBody),
        headers: {
          ...req.headers,
          'content-type': 'application/json',
        },
      });
    } catch (error) {
      // If parsing fails, return original request
      return req;
    }
  };
}

/**
 * Predefined sanitization rules for common use cases
 */
export const sanitizationRules = {
  leaveRequest: {
    reason: 'html' as const, // Allow basic formatting in reasons
    comments: 'html' as const,
    type: 'text' as const,
    startDate: 'text' as const,
    endDate: 'text' as const,
  },
  userProfile: {
    name: 'text' as const,
    email: 'text' as const,
    bio: 'html' as const,
  },
  general: {
    // Default rule for most fields
  }
} as const;