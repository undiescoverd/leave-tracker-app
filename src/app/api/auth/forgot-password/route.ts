import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email/service';
import { withAuthRateLimit } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { apiSuccess, apiError } from '@/lib/api/response';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

async function forgotPasswordHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Get validated data from middleware
    const validatedData = (req as any).validatedData;
    
    if (!validatedData) {
      return apiError('Request validation failed', 400);
    }
    
    const { email } = validatedData;

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    // Always return success to prevent email enumeration
    // But only send email if user actually exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Save token to database
      await prisma.user.update({
        where: { email },
        data: {
          resetToken,
          resetTokenExpiry,
          updatedAt: new Date()
        }
      });

      // Send reset email
      const emailResult = await sendPasswordResetEmail(email, resetToken);
      
      if (!emailResult.success) {
        console.error('Failed to send reset email:', emailResult.error);
        // Don't expose email service errors to client
      }
    }

    return NextResponse.json(
      { 
        message: 'If an account with that email exists, you will receive a password reset link shortly.' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return apiError('Internal server error', 500);
  }
}

// Apply comprehensive security with rate limiting for auth operations
export const POST = withCompleteSecurity(
  withAuthRateLimit(forgotPasswordHandler),
  {
    validateInput: true,
    schema: forgotPasswordSchema,
    sanitizationRule: 'general'
  }
);