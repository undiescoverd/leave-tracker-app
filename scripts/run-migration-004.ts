/**
 * Script to run migration 004_expand_role_enum.sql
 * This migration must be run before deploying code changes
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SECRET_KEY:', supabaseServiceKey ? '[REDACTED]' : 'NOT SET');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🔄 Running migration 004_expand_role_enum.sql...\n');

  try {
    // Read the migration file
    const migrationPath = resolve(__dirname, '../supabase/migrations/004_expand_role_enum.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Checking current role distribution...\n');

    // Check current roles
    const { data: currentUsers, error: currentError } = await supabaseAdmin
      .from('users')
      .select('email, role');

    if (currentError) {
      throw new Error(`Failed to fetch current users: ${currentError.message}`);
    }

    console.log('Current users and roles:');
    currentUsers?.forEach(user => {
      console.log(`  - ${user.email}: ${user.role}`);
    });
    console.log('');

    // Execute the migration
    // Note: Supabase client doesn't support raw SQL execution
    // We need to use the Supabase SQL editor or psql directly
    console.log('⚠️  IMPORTANT:');
    console.log('The Supabase JavaScript client does not support raw SQL execution.');
    console.log('You must run this migration using ONE of the following methods:\n');

    console.log('METHOD 1 - Supabase Dashboard (Recommended):');
    console.log('1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('2. Copy and paste the contents of:');
    console.log(`   ${migrationPath}`);
    console.log('3. Click "Run" to execute the migration\n');

    console.log('METHOD 2 - PostgreSQL CLI (psql):');
    console.log('1. Get your database connection string from Supabase dashboard');
    console.log('2. Run: psql "YOUR_CONNECTION_STRING" -f supabase/migrations/004_expand_role_enum.sql\n');

    console.log('METHOD 3 - Supabase CLI (if installed):');
    console.log('1. Install: npm install -g supabase');
    console.log('2. Link project: supabase link --project-ref YOUR_PROJECT_REF');
    console.log('3. Run: supabase db push\n');

    console.log('✅ After running the migration, verify with:');
    console.log('   SELECT email, role FROM users;\n');

    console.log('Migration file path:');
    console.log(`   ${migrationPath}\n`);

    // Show migration preview
    console.log('📋 Migration Preview (first 50 lines):');
    console.log('─'.repeat(80));
    console.log(migrationSQL.split('\n').slice(0, 50).join('\n'));
    console.log('─'.repeat(80));
    console.log(`... (${migrationSQL.split('\n').length} total lines)\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('✅ Migration instructions displayed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
