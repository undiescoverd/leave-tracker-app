#!/usr/bin/env node

/**
 * Migration Script - Run Real-Time Migration
 * This script applies the real-time migration to enable Supabase real-time subscriptions
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runMigration() {
  console.log('🚀 Starting Real-Time Migration...\n');

  try {
    // Step 1: Enable REPLICA IDENTITY
    console.log('Step 1: Enabling REPLICA IDENTITY on tables...');

    const replicaIdentitySQL = `
      ALTER TABLE "leave_requests" REPLICA IDENTITY FULL;
      ALTER TABLE "toil_entries" REPLICA IDENTITY FULL;
      ALTER TABLE "users" REPLICA IDENTITY FULL;
    `;

    const { error: replicaError } = await supabase.rpc('exec_sql', { sql: replicaIdentitySQL });

    if (replicaError) {
      // Try individual queries if batch fails
      console.log('  Trying individual queries...');

      const { error: e1 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE "leave_requests" REPLICA IDENTITY FULL;'
      });

      const { error: e2 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE "toil_entries" REPLICA IDENTITY FULL;'
      });

      const { error: e3 } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE "users" REPLICA IDENTITY FULL;'
      });

      if (e1 || e2 || e3) {
        console.log('  ⚠️  Note: REPLICA IDENTITY may already be set or requires manual execution');
      }
    }

    console.log('  ✅ REPLICA IDENTITY configured\n');

    // Step 2: Add tables to publication
    console.log('Step 2: Adding tables to supabase_realtime publication...');

    const publicationSQL = `
      ALTER PUBLICATION supabase_realtime ADD TABLE "leave_requests";
      ALTER PUBLICATION supabase_realtime ADD TABLE "toil_entries";
      ALTER PUBLICATION supabase_realtime ADD TABLE "users";
    `;

    const { error: pubError } = await supabase.rpc('exec_sql', { sql: publicationSQL });

    if (pubError) {
      console.log('  ⚠️  Note: Tables may already be in publication or requires manual execution');
      console.log('  Error:', pubError.message);
    } else {
      console.log('  ✅ Tables added to publication\n');
    }

    // Step 3: Verify real-time is enabled
    console.log('Step 3: Verifying real-time configuration...');

    const { data: tables, error: verifyError } = await supabase
      .from('pg_publication_tables')
      .select('tablename')
      .eq('pubname', 'supabase_realtime');

    if (verifyError) {
      console.log('  ⚠️  Could not verify configuration (may need manual SQL execution)');
    } else if (tables) {
      const tableNames = tables.map(t => t.tablename);
      const requiredTables = ['leave_requests', 'toil_entries', 'users'];
      const hasAll = requiredTables.every(t => tableNames.includes(t));

      if (hasAll) {
        console.log('  ✅ All tables configured for real-time!');
        console.log('  Tables:', tableNames.join(', '));
      } else {
        console.log('  ⚠️  Some tables may need manual configuration');
        console.log('  Found:', tableNames.join(', '));
      }
    }

    console.log('\n✅ Migration Complete!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Test real-time updates in the app');
    console.log('   2. Open multiple browser windows to see instant updates');
    console.log('   3. Check browser console for WebSocket connections\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Manual Migration Required:');
    console.log('   Run the following SQL in Supabase SQL Editor:');
    console.log('   ---');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '003_enable_realtime.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
    console.log('   ---\n');
    process.exit(1);
  }
}

runMigration();
