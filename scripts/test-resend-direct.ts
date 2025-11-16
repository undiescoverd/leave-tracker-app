#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { Resend } from 'resend';

async function testResendDirect() {
  console.log('🚀 Testing Direct Resend Integration...\n');

  const apiKey = process.env.RESEND_API_KEY;
  const emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS;

  console.log('🔍 Environment Check:');
  console.log('RESEND_API_KEY:', apiKey ? '✅ Set' : '❌ Missing');
  console.log('ENABLE_EMAIL_NOTIFICATIONS:', emailEnabled);
  console.log();

  if (!apiKey) {
    console.log('❌ RESEND_API_KEY not found in environment');
    return;
  }

  if (emailEnabled !== 'true') {
    console.log('❌ Email notifications not enabled (ENABLE_EMAIL_NOTIFICATIONS !== "true")');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    
    console.log('📧 Sending real email via Resend...');
    
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'ian.jamesvincent@gmail.com',
      subject: '🧪 Test Email from TDH Agency Leave Tracker',
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af; margin-bottom: 20px;">✅ Email Integration Test</h2>
          <p>Hi Ian,</p>
          <p>This is a test email from your Leave Tracker app!</p>
          <p>If you're reading this, the Resend integration is working perfectly! 🎉</p>
          <p>Best regards,<br><strong>TDH Agency Leave System</strong></p>
        </div>
      `,
    });

    if (error) {
      console.log('❌ Resend API Error:', error);
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', data?.id);
    console.log('💌 Check your inbox at ian.jamesvincent@gmail.com');
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testResendDirect();