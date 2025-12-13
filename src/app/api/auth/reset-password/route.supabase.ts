import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuthRateLimit } from '@/lib/middleware/auth';
import { withCompleteSecurity, validationSchemas } from '@/lib/middleware/security';
import { apiSuccess, apiError, HttpStatus, HttpStatusCode } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { ValidationError, BadRequestError } from '@/lib/api/errors';
import * as bcrypt from 'bcryptjs';

async function resetPasswordHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Get validated and sanitized data from middleware
    const validatedData = (req as { validatedData?: { token: string; password: string } }).validatedData;

    if (!validatedData) {
      throw new ValidationError('Request validation failed');
    }

    const { token, password } = validatedData;

    // Log password reset attempt (without sensitive data)
    logger.info('Password reset attempt', {
      hasToken: !!token,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // Find user by reset token and verify it's not expired
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .gt('reset_token_expiry', new Date().toISOString()) // Token must not be expired
      .single();

    if (findError || !user) {
      // Security: Log failed reset attempts
      logger.securityEvent('password_reset_failure', 'medium', undefined, {
        reason: 'invalid_or_expired_token',
        token: token.substring(0, 8) + '...', // Log partial token for debugging
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });

      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Log successful password reset
    logger.securityEvent('password_reset_success', 'medium', user.email, {
      userId: user.id,
      action: 'password_changed',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return apiSuccess({
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Password reset error:', undefined, error as Error);

    if (error instanceof ValidationError || error instanceof BadRequestError) {
      return apiError(error.message, error.statusCode as HttpStatusCode);
    }

    return apiError('Failed to reset password', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// Apply strict security with enhanced rate limiting for auth operations
export const POST = withCompleteSecurity(withAuthRateLimit(resetPasswordHandler), {
  validateInput: true,
  schema: validationSchemas.passwordReset,
  sanitizationRule: 'userProfile',
  skipCSRF: false,
});
