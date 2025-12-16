/**
 * Verification script for migration 004
 * Checks that user roles have been updated correctly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyMigration() {
  console.log('🔍 Verifying Migration 004 - Role ENUM Expansion\n');

  try {
    // Fetch all users with their roles
    const { data: users, error } = await supabase
      .from('users')
      .select('email, name, role')
      .order('email');

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    console.log('✅ Current User Roles:');
    console.log('━'.repeat(70));

    const expectedRoles = {
      'senay@tdhagency.com': 'OWNER',
      'ian@tdhagency.com': 'TECH_ADMIN',
      'sup@tdhagency.com': 'USER',
      'luis@tdhagency.com': 'USER',
    };

    let allCorrect = true;

    users?.forEach(user => {
      const icon = user.role === 'OWNER' ? '👑' :
                   user.role === 'TECH_ADMIN' ? '🔧' :
                   user.role === 'ADMIN' ? '⚙️' : '👤';

      const expected = expectedRoles[user.email as keyof typeof expectedRoles];
      const status = expected === user.role ? '✅' : '❌';

      if (expected !== user.role) {
        allCorrect = false;
      }

      console.log(`${status} ${icon} ${user.name?.padEnd(20)} (${user.email.padEnd(25)}) → ${user.role}`);

      if (expected && expected !== user.role) {
        console.log(`   ⚠️  Expected: ${expected}, Got: ${user.role}`);
      }
    });

    console.log('━'.repeat(70));

    if (allCorrect) {
      console.log('\n✅ Migration 004 Verification PASSED');
      console.log('   All user roles are correctly set:');
      console.log('   - Senay: OWNER (business admin, no leave balance)');
      console.log('   - Ian: TECH_ADMIN (technical admin, no leave balance)');
      console.log('   - Sup & Luis: USER (employees with leave balance)\n');
    } else {
      console.log('\n❌ Migration 004 Verification FAILED');
      console.log('   Some roles are not set correctly. Please review the migration.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Verification Error:', error);
    process.exit(1);
  }
}

verifyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
