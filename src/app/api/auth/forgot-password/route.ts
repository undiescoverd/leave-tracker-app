import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}