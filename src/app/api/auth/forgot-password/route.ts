import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email/service';
import { withAuthRateLimit } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { apiSuccess, apiError } from '@/lib/api/response';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
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
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    // But only send email if user actually exists
    if (user && !findError) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (updateError) {
        console.error('Failed to save reset token:', updateError);
        // Don't expose database errors to client
      } else {
        // Send reset email
        const emailResult = await sendPasswordResetEmail(email, resetToken);

        if (!emailResult.success) {
          console.error('Failed to send reset email:', emailResult.error);
          // Don't expose email service errors to client
        }
      }
    }

    return NextResponse.json(
      {
        message: 'If an account with that email exists, you will receive a password reset link shortly.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return apiError('Internal server error', 500);
  }
}

// Apply comprehensive security with rate limiting for auth operations
export const POST = withCompleteSecurity(withAuthRateLimit(forgotPasswordHandler), {
  validateInput: true,
  schema: forgotPasswordSchema,
  sanitizationRule: 'general',
});
