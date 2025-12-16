#!/usr/bin/env tsx
/**
 * Verify credentials work by checking directly with bcrypt
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function verifyCredentials() {
  console.log('🔍 Verifying credentials...\n');

  const testUsers = [
    { email: 'sup@tdhagency.com', password: 'Password123!' },
    { email: 'ian@tdhagency.com', password: 'Password123!' },
  ];

  for (const testUser of testUsers) {
    console.log(`Testing: ${testUser.email}`);

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', testUser.email)
        .single();

      if (error || !user) {
        console.log('  ❌ User not found in database\n');
        continue;
      }

      console.log(`  ✅ User found: ${user.name} (${user.role})`);

      const isValid = await bcrypt.compare(testUser.password, user.password);

      if (isValid) {
        console.log(`  ✅ Password is CORRECT!\n`);
      } else {
        console.log(`  ❌ Password is WRONG!\n`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
}

verifyCredentials().catch(console.error);
