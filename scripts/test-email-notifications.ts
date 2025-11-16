#!/usr/bin/env tsx

/**
 * Test script for email notifications
 * Tests the email service functionality
 */

import { EmailService } from '../src/lib/email/service';

async function testEmailNotifications() {
  console.log('🧪 Testing Email Notifications...\n');

  try {
    // Test 1: Leave Request Confirmation
    console.log('📧 Test 1: Leave Request Confirmation');
    const confirmation = await EmailService.sendLeaveRequestConfirmation(
      'test@example.com',
      'John Doe',
      'January 15, 2025',
      'January 19, 2025',
      'ANNUAL'
    );
    console.log('Result:', confirmation.success ? '✅ Success' : '❌ Failed');
    if (!confirmation.success) console.log('Error:', confirmation.error);
    console.log();

    // Test 2: Approval Notification
    console.log('📧 Test 2: Approval Notification');
    const approval = await EmailService.sendApprovalNotification(
      'test@example.com',
      'John Doe',
      'January 15, 2025',
      'January 19, 2025',
      'Jane Smith'
    );
    console.log('Result:', approval.success ? '✅ Success' : '❌ Failed');
    if (!approval.success) console.log('Error:', approval.error);
    console.log();

    // Test 3: Rejection Notification
    console.log('📧 Test 3: Rejection Notification');
    const rejection = await EmailService.sendRejectionNotification(
      'test@example.com',
      'John Doe',
      'January 15, 2025',
      'January 19, 2025',
      'Jane Smith',
      'Insufficient notice period'
    );
    console.log('Result:', rejection.success ? '✅ Success' : '❌ Failed');
    if (!rejection.success) console.log('Error:', rejection.error);
    console.log();

    // Test 4: UK Conflict Warning
    console.log('📧 Test 4: UK Conflict Warning');
    const conflict = await EmailService.sendUKConflictWarning(
      ['admin1@tdhagency.com', 'admin2@tdhagency.com'],
      'John Doe',
      'Jane Smith',
      'January 15, 2025 - January 19, 2025'
    );
    console.log('Result:', conflict.success ? '✅ Success' : '❌ Failed');
    if (!conflict.success) console.log('Error:', conflict.error);
    console.log();

    console.log('🎉 Email notification tests completed!');
    console.log('💡 In development mode, emails are logged to console');
    console.log('🔧 To send real emails, set RESEND_API_KEY and ENABLE_EMAIL_NOTIFICATIONS=true');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

testEmailNotifications();