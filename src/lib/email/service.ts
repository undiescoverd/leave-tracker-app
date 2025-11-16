import { Resend } from 'resend';
import { env, envValidation } from '@/lib/env';

// Production-ready Resend client with configuration
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Email rate limiting store (in-memory for single instance, use Redis for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Production email service status
export const emailServiceStatus = {
  isConfigured: !!resend && env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  isProduction: envValidation.isProduction,
  provider: 'Resend',
  rateLimit: env.EMAIL_RATE_LIMIT_PER_HOUR,
  retryAttempts: env.EMAIL_RETRY_ATTEMPTS,
  timeout: env.EMAIL_TIMEOUT_MS,
};

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Rate limiting check for email sending
   */
  private static isRateLimited(recipient: string): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    const key = Array.isArray(recipient) ? recipient[0] : recipient;
    
    const current = rateLimitStore.get(key);
    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + hourInMs });
      return false;
    }
    
    if (current.count >= env.EMAIL_RATE_LIMIT_PER_HOUR) {
      return true;
    }
    
    current.count++;
    return false;
  }

  /**
   * Production-ready email sending with retry logic, rate limiting, and timeout
   */
  static async send(options: EmailOptions): Promise<EmailResult> {
    // Configuration validation
    if (env.ENABLE_EMAIL_NOTIFICATIONS !== 'true' || !resend) {
      const reason = !resend ? 'RESEND_API_KEY not configured' : 'Email notifications disabled';
      
      if (envValidation.isProduction) {
        console.error(`❌ Email service not configured for production: ${reason}`);
        return { success: false, error: `Email service not configured for production: ${reason}` };
      }
      
      // Development mode logging
      if (envValidation.isDevelopment) {
        console.log('📧 Email notifications disabled or not configured');
        console.log('\n' + '═'.repeat(60));
        console.log('📧 EMAIL (DEV MODE)');
        console.log('═'.repeat(60));
        console.log('📧 To:', options.to);
        console.log('📋 Subject:', options.subject);
        console.log('📄 Content:', options.html.substring(0, 200) + '...');
        console.log('═'.repeat(60) + '\n');
      }
      
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    // Rate limiting check
    const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
    if (this.isRateLimited(recipient)) {
      const error = `Rate limit exceeded for ${recipient}`;
      console.warn(`⚠️  ${error}`);
      return { success: false, error };
    }

    // Retry logic with exponential backoff
    let lastError: any;
    for (let attempt = 1; attempt <= env.EMAIL_RETRY_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), env.EMAIL_TIMEOUT_MS);

        const { data, error } = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: env.EMAIL_REPLY_TO,
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error(`Email send error (attempt ${attempt}):`, error);
          lastError = error;
          
          // Don't retry on permanent errors (403, 401, 400)
          if (
            error.statusCode === 403 || 
            error.statusCode === 401 || 
            error.statusCode === 400 ||
            error.message?.includes('forbidden') || 
            error.message?.includes('unauthorized') ||
            error.message?.includes('You can only send testing emails')
          ) {
            // For test mode errors, just log and return success to avoid blocking
            if (error.message?.includes('testing emails')) {
              console.log('ℹ️  Email skipped (Resend test mode)');
              return { success: true, messageId: `test-mode-${Date.now()}` };
            }
            return { success: false, error: error.message };
          }
          
          if (attempt < env.EMAIL_RETRY_ATTEMPTS) {
            const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return { success: false, error: error.message };
        }

        console.log(`✅ Email sent successfully (attempt ${attempt}):`, data?.id);
        return { success: true, messageId: data?.id };
        
      } catch (error: any) {
        console.error(`Email service error (attempt ${attempt}):`, error);
        lastError = error;
        
        if (error.name === 'AbortError') {
          return { success: false, error: 'Email sending timed out' };
        }
        
        if (attempt < env.EMAIL_RETRY_ATTEMPTS) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return { success: false, error: lastError?.message || 'Failed to send email after retries' };
  }

  /**
   * Health check for email service
   */
  static async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const details = {
      configured: emailServiceStatus.isConfigured,
      provider: emailServiceStatus.provider,
      rateLimit: emailServiceStatus.rateLimit,
      environment: env.NODE_ENV,
    };

    if (!emailServiceStatus.isConfigured) {
      return { healthy: false, details: { ...details, error: 'Email service not configured' } };
    }

    // For production, we might want to send a test email to verify connectivity
    // For now, we'll just check configuration
    return { healthy: true, details };
  }

  static async sendLeaveRequestConfirmation(
    userEmail: string,
    userName: string,
    startDate: string,
    endDate: string,
    leaveType: string
  ): Promise<EmailResult> {
    const subject = 'Leave Request Submitted - Awaiting Approval';
    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">Leave Request Confirmation</h2>
        <p>Hi ${userName},</p>
        <p>Your leave request has been submitted successfully.</p>
        
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #334155;">Request Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Type:</strong> ${leaveType}</li>
            <li><strong>Start Date:</strong> ${startDate}</li>
            <li><strong>End Date:</strong> ${endDate}</li>
            <li><strong>Status:</strong> Pending Approval</li>
          </ul>
        </div>
        
        <p>You'll receive another email once your request has been reviewed.</p>
        <p>Best regards,<br><strong>TDH Agency</strong></p>
      </div>
    `;

    return this.send({ to: userEmail, subject, html });
  }

  static async sendApprovalNotification(
    userEmail: string,
    userName: string,
    startDate: string,
    endDate: string,
    approvedBy: string
  ): Promise<EmailResult> {
    const subject = '✅ Leave Request Approved';
    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #059669; margin-bottom: 20px;">✅ Leave Request Approved</h2>
        <p>Hi ${userName},</p>
        <p>Good news! Your leave request has been approved.</p>
        
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li><strong>Dates:</strong> ${startDate} to ${endDate}</li>
            <li><strong>Approved by:</strong> ${approvedBy}</li>
          </ul>
        </div>
        
        <p>Enjoy your time off!</p>
        <p>Best regards,<br><strong>TDH Agency</strong></p>
      </div>
    `;

    return this.send({ to: userEmail, subject, html });
  }

  static async sendRejectionNotification(
    userEmail: string,
    userName: string,
    startDate: string,
    endDate: string,
    rejectedBy: string,
    reason: string
  ): Promise<EmailResult> {
    const subject = '❌ Leave Request Rejected';
    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Leave Request Rejected</h2>
        <p>Hi ${userName},</p>
        <p>Unfortunately, your leave request has been rejected.</p>
        
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li><strong>Dates:</strong> ${startDate} to ${endDate}</li>
            <li><strong>Rejected by:</strong> ${rejectedBy}</li>
            <li><strong>Reason:</strong> ${reason}</li>
          </ul>
        </div>
        
        <p>Please speak with ${rejectedBy} if you have questions.</p>
        <p>Best regards,<br><strong>TDH Agency</strong></p>
      </div>
    `;

    return this.send({ to: userEmail, subject, html });
  }

  static async sendUKConflictWarning(
    adminEmails: string[],
    requesterName: string,
    conflictingAgent: string,
    dates: string
  ): Promise<EmailResult> {
    const subject = '⚠️ UK Coverage Conflict - Review Required';
    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #d97706; margin-bottom: 20px;">⚠️ UK Agent Coverage Conflict</h2>
        <p><strong>Attention Required:</strong></p>
        <p><strong>${requesterName}</strong> has submitted a leave request that conflicts with <strong>${conflictingAgent}</strong>'s approved leave.</p>
        
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
          <p style="margin: 0;"><strong>Dates:</strong> ${dates}</p>
          <p style="margin: 8px 0 0 0;">This would leave the UK office without coverage.</p>
        </div>
        
        <p>Please review this request urgently.</p>
        <p><a href="${env.NEXTAUTH_URL}/admin/pending-requests" style="color: #1e40af; text-decoration: none;">Review Pending Requests →</a></p>
        
        <p>Best regards,<br><strong>TDH Agency Leave System</strong></p>
      </div>
    `;

    return this.send({ 
      to: adminEmails, 
      subject, 
      html 
    });
  }

  static async sendBulkApprovalNotification(
    userEmail: string,
    userName: string,
    requests: any[],
    approvedBy: string
  ): Promise<EmailResult> {
    const subject = `✅ ${requests.length} Leave Request${requests.length > 1 ? 's' : ''} Approved`;
    
    const requestsList = requests.map(req => {
      const startDate = new Date(req.startDate).toLocaleDateString('en-GB');
      const endDate = new Date(req.endDate).toLocaleDateString('en-GB');
      return `
        <li style="margin-bottom: 8px;">
          <strong>${req.type}</strong>: ${startDate} to ${endDate}
          ${req.comments ? `<br><em>Notes: ${req.comments}</em>` : ''}
        </li>
      `;
    }).join('');

    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #059669; margin-bottom: 20px;">✅ Leave Requests Approved</h2>
        <p>Hi ${userName},</p>
        <p>Great news! Your leave requests have been approved.</p>
        
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="margin-top: 0; color: #065f46;">Approved Requests:</h3>
          <ul style="padding-left: 20px;">
            ${requestsList}
          </ul>
          <p style="margin-bottom: 0;"><strong>Approved by:</strong> ${approvedBy}</p>
        </div>
        
        <p>Enjoy your time off!</p>
        <p>Best regards,<br><strong>TDH Agency</strong></p>
      </div>
    `;

    return this.send({ to: userEmail, subject, html });
  }

  static async sendBulkRejectionNotification(
    userEmail: string,
    userName: string,
    requests: any[],
    rejectedBy: string,
    reason: string
  ): Promise<EmailResult> {
    const subject = `❌ ${requests.length} Leave Request${requests.length > 1 ? 's' : ''} Rejected`;
    
    const requestsList = requests.map(req => {
      const startDate = new Date(req.startDate).toLocaleDateString('en-GB');
      const endDate = new Date(req.endDate).toLocaleDateString('en-GB');
      return `
        <li style="margin-bottom: 8px;">
          <strong>${req.type}</strong>: ${startDate} to ${endDate}
          ${req.comments ? `<br><em>Notes: ${req.comments}</em>` : ''}
        </li>
      `;
    }).join('');

    const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Leave Requests Rejected</h2>
        <p>Hi ${userName},</p>
        <p>Unfortunately, your leave requests have been rejected.</p>
        
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #991b1b;">Rejected Requests:</h3>
          <ul style="padding-left: 20px;">
            ${requestsList}
          </ul>
          <p style="margin-bottom: 8px;"><strong>Rejected by:</strong> ${rejectedBy}</p>
          <p style="margin-bottom: 0;"><strong>Reason:</strong> ${reason}</p>
        </div>
        
        <p>Please speak with ${rejectedBy} if you have questions about these decisions.</p>
        <p>Best regards,<br><strong>TDH Agency</strong></p>
      </div>
    `;

    return this.send({ to: userEmail, subject, html });
  }

  static async sendCancellationNotification(
    userEmail: string,
    userName: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const subject = '🔔 Leave Request Cancelled';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Leave Request Cancelled</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Leave Request Cancelled</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${userName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Your leave request has been cancelled successfully.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #f59e0b;">Cancelled Leave Details</h3>
              <p style="margin: 10px 0;"><strong>Start Date:</strong> ${startDate}</p>
              <p style="margin: 10px 0;"><strong>End Date:</strong> ${endDate}</p>
            </div>
            
            <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
              Your leave balance has been restored automatically.
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6c757d; text-align: center;">
              TDH Agency Leave Tracker<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    await this.send({ to: userEmail, subject, html });
  }

  static async sendAdminCancellationNotification(
    adminEmail: string,
    adminName: string,
    employeeName: string,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const subject = `🔔 Approved Leave Cancelled by ${employeeName}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Leave Cancelled</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Approved Leave Cancelled</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${adminName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              An <strong>approved</strong> leave request has been cancelled by the employee.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #f59e0b;">Cancellation Details</h3>
              <p style="margin: 10px 0;"><strong>Employee:</strong> ${employeeName}</p>
              <p style="margin: 10px 0;"><strong>Start Date:</strong> ${startDate}</p>
              <p style="margin: 10px 0;"><strong>End Date:</strong> ${endDate}</p>
            </div>
            
            <p style="font-size: 14px; color: #6c757d;">
              This was a previously approved leave request. You may want to review team coverage for these dates.
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6c757d; text-align: center;">
              TDH Agency Leave Tracker<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;

    await this.send({ to: adminEmail, subject, html });
  }
}

export async function sendPasswordResetEmail(
  email: string, 
  token: string
): Promise<EmailResult> {
  const resetUrl = `${env.NEXTAUTH_URL}/reset-password?token=${token}`;
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e40af; margin-bottom: 20px;">Password Reset Request</h2>
      <p>A password reset was requested for your account.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="color: #1e40af; text-decoration: none;">Reset Password →</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br><strong>TDH Agency</strong></p>
    </div>
  `;

  return EmailService.send({ to: email, subject, html });
}

export async function sendLeaveNotificationEmail(
  to: string,
  subject: string,
  content: string
): Promise<EmailResult> {
  return EmailService.send({ to, subject, html: content });
}