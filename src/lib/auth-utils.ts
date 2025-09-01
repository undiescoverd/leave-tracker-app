import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "./prisma";
import { auth } from "./auth";
import { AuthenticationError, AuthorizationError } from "./api/errors";
import { logger } from "./logger";
import type { User } from "@prisma/client";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: "USER" | "ADMIN";
}) {
  const hashedPassword = await hashPassword(data.password);
  
  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || "USER",
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Enhanced authentication with session integrity validation
 * Throws AuthenticationError if user is not authenticated or not found
 */
export async function getAuthenticatedUser(): Promise<User> {
  const session = await auth();
  
  if (!session?.user?.email) {
    logger.securityEvent('authentication_failure', 'medium', undefined, {
      reason: 'no_session_or_email'
    });
    throw new AuthenticationError('You must be logged in to access this resource');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    logger.securityEvent('authentication_failure', 'high', session.user.email, {
      reason: 'user_not_found_in_db',
      sessionEmail: session.user.email
    });
    throw new AuthenticationError('User not found');
  }

  // Note: Session user ID can differ from DB user ID during normal operations

  // Log successful authentication
  logger.debug('User authenticated successfully', {
    userId: user.id,
    email: user.email,
    role: user.role
  });

  return user;
}

/**
 * Enhanced admin role requirement with audit logging
 * Throws AuthenticationError if user is not admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAuthenticatedUser();
  
  if (user.role !== 'ADMIN') {
    logger.securityEvent('authorization_failure', 'medium', user.email, {
      userRole: user.role,
      requiredRole: 'ADMIN',
      userId: user.id
    });
    throw new AuthorizationError('Administrator access required');
  }

  logger.debug('Admin access granted', {
    userId: user.id,
    email: user.email
  });

  return user;
}

/**
 * Get authenticated user or null if not authenticated
 * Does not throw errors, returns null instead
 */
export async function getOptionalAuthenticatedUser(): Promise<User | null> {
  try {
    return await getAuthenticatedUser();
  } catch {
    return null;
  }
}

/**
 * Enhanced role-based access control with granular permissions
 */
export async function requireRole(allowedRoles: ('USER' | 'ADMIN')[]): Promise<User> {
  const user = await getAuthenticatedUser();
  
  if (!allowedRoles.includes(user.role)) {
    logger.securityEvent('authorization_failure', 'medium', user.email, {
      userRole: user.role,
      allowedRoles,
      userId: user.id
    });
    throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }

  return user;
}

/**
 * Resource ownership validation - ensures user can only access their own resources
 */
export async function requireResourceOwnership(
  resourceUserId: string, 
  allowAdminOverride: boolean = true
): Promise<User> {
  const user = await getAuthenticatedUser();
  
  // Admin can access any resource if override is allowed
  if (allowAdminOverride && user.role === 'ADMIN') {
    logger.debug('Admin override for resource access', {
      adminId: user.id,
      targetResourceUserId: resourceUserId
    });
    return user;
  }
  
  // Regular users can only access their own resources
  if (user.id !== resourceUserId) {
    logger.securityEvent('authorization_failure', 'medium', user.email, {
      userId: user.id,
      attemptedResourceUserId: resourceUserId,
      reason: 'resource_ownership_violation'
    });
    throw new AuthorizationError('You can only access your own resources');
  }
  
  return user;
}

/**
 * Session validation without user lookup (for performance-critical paths)
 */
export async function validateSession(): Promise<{ isValid: boolean; userId?: string; role?: string }> {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return { isValid: false };
    }
    
    return {
      isValid: true,
      userId: session.user.id,
      role: session.user.role
    };
  } catch {
    return { isValid: false };
  }
}

/**
 * IP-based security validation (for high-risk operations)
 */
export function validateClientSecurity(req: NextRequest): {
  isSecure: boolean;
  clientInfo: {
    ip: string;
    userAgent: string;
    country?: string;
  };
} {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             req.headers.get('x-real-ip') || 
             
             'unknown';
  
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const country = req.headers.get('cf-ipcountry'); // Cloudflare header
  
  // Basic security checks
  const isSecure = !req.headers.get('user-agent')?.includes('bot') &&
                   ip !== 'unknown' &&
                   userAgent !== 'unknown';
  
  return {
    isSecure,
    clientInfo: { ip, userAgent, country: country || undefined }
  };
}

/**
 * Create secure API response with security headers
 */
export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

/**
 * Audit logging for sensitive operations
 */
export function auditLog(
  action: string,
  userId: string,
  details: Record<string, any> = {},
  risk: 'low' | 'medium' | 'high' = 'medium'
) {
  logger.securityEvent('audit_log', risk, userId, {
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
}