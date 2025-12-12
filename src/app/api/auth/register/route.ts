import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/auth-utils";
import { withAuthRateLimit } from "@/lib/middleware/auth";
import { withCompleteSecurity, validationSchemas } from "@/lib/middleware/security";
import { apiSuccess, apiError, HttpStatus, HttpStatusCode } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { ValidationError, ConflictError } from "@/lib/api/errors";

async function registerHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Get validated and sanitized data from middleware
    const validatedData = (req as { validatedData?: { email: string; password: string; name: string } }).validatedData;

    if (!validatedData) {
      throw new ValidationError('Request validation failed');
    }

    const { email, password, name } = validatedData;

    // Log registration attempt (without sensitive data)
    logger.info('User registration attempt', {
      email,
      name,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      // Security: Don't reveal that user exists, but log the attempt
      logger.securityEvent('registration_conflict', 'medium', email, {
        action: 'duplicate_registration_attempt',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      
      throw new ConflictError('Email address is already registered');
    }

    // Create new user (default role is USER for security)
    const user = await createUser({
      email,
      password,
      name,
      role: "USER", // Explicitly set to USER for security
    });

    // Log successful registration (without sensitive data)
    logger.info('User registration successful', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Return user data without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    
    return apiSuccess({
      message: "User created successfully",
      user: userWithoutPassword,
    }, undefined, HttpStatus.CREATED);

  } catch (error) {
    logger.error('Registration error:', undefined, error as Error);
    
    if (error instanceof ValidationError || error instanceof ConflictError) {
      return apiError(error.message, error.statusCode as HttpStatusCode);
    }
    
    return apiError("Failed to create user", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// Apply comprehensive security with strict validation
export const POST = withCompleteSecurity(
  withAuthRateLimit(registerHandler),
  {
    validateInput: true,
    schema: validationSchemas.userRegistration,
    sanitizationRule: 'userProfile',
    skipCSRF: false
  }
);