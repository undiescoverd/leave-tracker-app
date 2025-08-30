import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

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
  static async send(options: EmailOptions): Promise<EmailResult> {
    if (env.ENABLE_EMAIL_NOTIFICATIONS !== 'true' || !resend) {
      console.log('📧 Email notifications disabled or not configured');
      if (env.NODE_ENV === 'development') {
        console.log('\n' + '═'.repeat(60));
        console.log('📧 EMAIL (DEV MODE)');
        console.log('═'.repeat(60));
        console.log('📧 To:', options.to);
        console.log('📋 Subject:', options.subject);
        console.log('📄 Content:', options.html);
        console.log('═'.repeat(60) + '\n');
      }
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: env.EMAIL_REPLY_TO,
      });

      if (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Email sent successfully:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error: 'Failed to send email' };
    }
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