import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { withAuthRateLimit } from "@/lib/middleware/auth";
import { withCompleteSecurity, validationSchemas } from "@/lib/middleware/security";
import { apiSuccess, apiError, HttpStatus } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { ValidationError, BadRequestError } from "@/lib/api/errors";

async function resetPasswordHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Get validated and sanitized data from middleware
    const validatedData = (req as { validatedData?: unknown }).validatedData;
    
    if (!validatedData) {
      throw new ValidationError('Request validation failed');
    }

    const { token, password } = validatedData;

    // Log password reset attempt (without sensitive data)
    logger.info('Password reset attempt', {
      hasToken: !!token,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });

    // Find user by reset token and verify it's not expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      // Security: Log failed reset attempts
      logger.securityEvent('password_reset_failure', 'medium', undefined, {
        reason: 'invalid_or_expired_token',
        token: token.substring(0, 8) + '...', // Log partial token for debugging
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      });
      
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Log successful password reset
    logger.securityEvent('password_reset_success', 'medium', user.email, {
      userId: user.id,
      action: 'password_changed',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    });

    return apiSuccess({
      message: "Password reset successfully",
    });

  } catch (error) {
    logger.error('Password reset error:', undefined, error as Error);
    
    if (error instanceof ValidationError || error instanceof BadRequestError) {
      return apiError(error.message, error.statusCode as number);
    }
    
    return apiError("Failed to reset password", HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// Apply strict security with enhanced rate limiting for auth operations
export const POST = withCompleteSecurity(
  withAuthRateLimit(resetPasswordHandler),
  {
    validateInput: true,
    schema: validationSchemas.passwordReset,
    sanitizationRule: 'userProfile',
    skipCSRF: false
  }
);