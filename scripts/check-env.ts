#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

console.log('🔍 Environment Variables Check:');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
console.log('ENABLE_EMAIL_NOTIFICATIONS:', process.env.ENABLE_EMAIL_NOTIFICATIONS || 'Not set');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
console.log('EMAIL_REPLY_TO:', process.env.EMAIL_REPLY_TO || 'Not set');

console.log('\n📄 .env.local file contents:');
import { readFileSync } from 'fs';
try {
  const envContent = readFileSync('.env.local', 'utf8');
  console.log(envContent);
} catch (error) {
  console.log('❌ Could not read .env.local file');
}