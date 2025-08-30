#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { Resend } from 'resend';

async function testEmailFinal() {
  console.log('🎯 Final Email Integration Test...\n');

  const apiKey = process.env.RESEND_API_KEY;
  const emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS;
  const emailFrom = 'onboarding@resend.dev'; // Use verified Resend domain

  console.log('📋 Configuration:');
  console.log('API Key:', apiKey ? '✅ Set' : '❌ Missing');
  console.log('Notifications:', emailEnabled);
  console.log('From:', emailFrom);
  console.log();

  if (!apiKey || emailEnabled !== 'true') {
    console.log('❌ Email not properly configured');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    
    console.log('📧 Sending Leave Request Confirmation...');
    
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: 'ian.jamesvincent@gmail.com',
      subject: 'Leave Request Submitted - Awaiting Approval',
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Leave Request Confirmation</h2>
          <p>Hi Ian Vincent,</p>
          <p>Your leave request has been submitted successfully.</p>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #334155;">Request Details</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Type:</strong> ANNUAL</li>
              <li><strong>Start Date:</strong> January 20, 2025</li>
              <li><strong>End Date:</strong> January 24, 2025</li>
              <li><strong>Status:</strong> Pending Approval</li>
            </ul>
          </div>
          
          <p>You'll receive another email once your request has been reviewed.</p>
          <p>Best regards,<br><strong>TDH Agency</strong></p>
        </div>
      `,
    });

    if (error) {
      console.log('❌ Email failed:', error);
      return;
    }

    console.log('🎉 SUCCESS! Real email sent via Resend!');
    console.log('📨 Message ID:', data?.id);
    console.log('💌 Check your inbox at ian.jamesvincent@gmail.com');
    console.log('📧 The Leave Tracker will now send real emails for all notifications!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEmailFinal();