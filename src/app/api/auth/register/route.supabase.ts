import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuthRateLimit } from '@/lib/middleware/auth';
import { withCompleteSecurity, validationSchemas } from '@/lib/middleware/security';
import { apiSuccess, apiError, HttpStatus, HttpStatusCode } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { ValidationError, ConflictError } from '@/lib/api/errors';
import * as bcrypt from 'bcryptjs';

async function registerHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Get validated and sanitized data from middleware
    const validatedData = (req as { validatedData?: { email: string; password: string; name: string } })
      .validatedData;

    if (!validatedData) {
      throw new ValidationError('Request validation failed');
    }

    const { email, password, name } = validatedData;

    // Log registration attempt (without sensitive data)
    logger.info('User registration attempt', {
      email,
      name,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    // Note: Supabase returns an error if no rows found, which is what we want
    if (existingUser && !checkError) {
      // Security: Don't reveal that user exists, but log the attempt
      logger.securityEvent('registration_conflict', 'medium', email, {
        action: 'duplicate_registration_attempt',
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });

      throw new ConflictError('Email address is already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user (default role is USER for security)
    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        role: 'USER', // Explicitly set to USER for security
        annual_leave_balance: 32, // Default allowance
        toil_balance: 0,
        sick_leave_balance: 3,
      })
      .select()
      .single();

    if (createError || !user) {
      throw new Error(`Failed to create user: ${createError?.message || 'Unknown error'}`);
    }

    // Log successful registration (without sensitive data)
    logger.info('User registration successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user data without password (camelCase for frontend)
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      annualLeaveBalance: user.annual_leave_balance,
      toilBalance: user.toil_balance,
      sickLeaveBalance: user.sick_leave_balance,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return apiSuccess(
      {
        message: 'User created successfully',
        user: userWithoutPassword,
      },
      undefined,
      HttpStatus.CREATED
    );
  } catch (error) {
    logger.error('Registration error:', undefined, error as Error);

    if (error instanceof ValidationError || error instanceof ConflictError) {
      return apiError(error.message, error.statusCode as HttpStatusCode);
    }

    return apiError('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// Apply comprehensive security with strict validation
export const POST = withCompleteSecurity(withAuthRateLimit(registerHandler), {
  validateInput: true,
  schema: validationSchemas.userRegistration,
  sanitizationRule: 'userProfile',
  skipCSRF: false,
});
