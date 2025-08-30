#!/usr/bin/env tsx

/**
 * Test script for real email sending with Resend
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { EmailService } from '../src/lib/email/service';

async function testRealEmail() {
  console.log('🚀 Testing Real Email Sending with Resend...\n');

  try {
    // Test with a real email address
    console.log('📧 Sending test confirmation email...');
    const result = await EmailService.sendLeaveRequestConfirmation(
      'ian.jamesvincent@gmail.com',
      'Ian Vincent',
      'January 20, 2025',
      'January 24, 2025',
      'ANNUAL'
    );

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('📨 Message ID:', result.messageId);
      console.log('💌 Check your inbox at ian.jamesvincent@gmail.com');
    } else {
      console.log('❌ Email failed to send');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealEmail();