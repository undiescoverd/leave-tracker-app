#!/usr/bin/env tsx
/**
 * Supabase Data Migration Script
 *
 * Migrates data from old Supabase project to new dev/prod projects
 *
 * Usage:
 *   # Migrate to dev project
 *   npm run migrate:data -- --target=dev
 *
 *   # Migrate to prod project
 *   npm run migrate:data -- --target=prod
 *
 *   # Dry run (no actual writes)
 *   npm run migrate:data -- --target=dev --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// =====================================================
// CONFIGURATION
// =====================================================

interface MigrationConfig {
  source: {
    url: string;
    key: string;
  };
  target: {
    url: string;
    key: string;
  };
  dryRun: boolean;
  targetEnv: 'dev' | 'prod';
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetArg = args.find(arg => arg.startsWith('--target='));
const dryRunArg = args.includes('--dry-run');

if (!targetArg) {
  console.error('❌ Error: --target flag is required (dev or prod)');
  console.log('\nUsage:');
  console.log('  npm run migrate:data -- --target=dev');
  console.log('  npm run migrate:data -- --target=prod');
  console.log('  npm run migrate:data -- --target=dev --dry-run');
  process.exit(1);
}

const targetEnv = targetArg.split('=')[1] as 'dev' | 'prod';

if (!['dev', 'prod'].includes(targetEnv)) {
  console.error('❌ Error: --target must be either "dev" or "prod"');
  process.exit(1);
}

// Load target environment configuration
const targetEnvFile = targetEnv === 'dev'
  ? '.env.development.local'
  : '.env.production.local';

const targetEnvPath = resolve(process.cwd(), targetEnvFile);
let targetEnvConfig: any = {};

try {
  const targetEnvContent = readFileSync(targetEnvPath, 'utf-8');
  targetEnvConfig = dotenv.parse(targetEnvContent);
} catch (error) {
  console.error(`❌ Error: Could not read ${targetEnvFile}`);
  console.error('Make sure the file exists with the correct Supabase credentials');
  process.exit(1);
}

// Build configuration
const config: MigrationConfig = {
  source: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  target: {
    url: targetEnvConfig.NEXT_PUBLIC_SUPABASE_URL,
    key: targetEnvConfig.SUPABASE_SECRET_KEY || targetEnvConfig.SUPABASE_SERVICE_ROLE_KEY,
  },
  dryRun: dryRunArg,
  targetEnv,
};

// Validate configuration
if (!config.source.url || !config.source.key) {
  console.error('❌ Error: Source Supabase credentials missing in .env.local');
  process.exit(1);
}

if (!config.target.url || !config.target.key) {
  console.error(`❌ Error: Target Supabase credentials missing in ${targetEnvFile}`);
  console.error('Please update the file with your Supabase secret key');
  process.exit(1);
}

// =====================================================
// SUPABASE CLIENTS
// =====================================================

const sourceClient = createClient(config.source.url, config.source.key);
const targetClient = createClient(config.target.url, config.target.key);

console.log('🔄 Supabase Data Migration');
console.log('========================');
console.log(`Source: ${config.source.url}`);
console.log(`Target: ${config.target.url} (${targetEnv})`);
console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
console.log('');

// =====================================================
// MIGRATION FUNCTIONS
// =====================================================

interface MigrationStats {
  users: { fetched: number; inserted: number; errors: number };
  leave_requests: { fetched: number; inserted: number; errors: number };
  toil_entries: { fetched: number; inserted: number; errors: number };
}

const stats: MigrationStats = {
  users: { fetched: 0, inserted: 0, errors: 0 },
  leave_requests: { fetched: 0, inserted: 0, errors: 0 },
  toil_entries: { fetched: 0, inserted: 0, errors: 0 },
};

async function migrateTable<T extends Record<string, any>>(
  tableName: string,
  transformFn?: (row: T) => T
): Promise<void> {
  console.log(`\n📊 Migrating table: ${tableName}`);
  console.log('─'.repeat(50));

  // Fetch all data from source
  const { data: sourceData, error: fetchError } = await sourceClient
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error(`❌ Error fetching from ${tableName}:`, fetchError);
    stats[tableName as keyof MigrationStats].errors++;
    return;
  }

  if (!sourceData || sourceData.length === 0) {
    console.log(`⚠️  No data found in ${tableName}`);
    return;
  }

  stats[tableName as keyof MigrationStats].fetched = sourceData.length;
  console.log(`✅ Fetched ${sourceData.length} rows from source`);

  if (config.dryRun) {
    console.log(`🔍 DRY RUN: Would insert ${sourceData.length} rows`);
    stats[tableName as keyof MigrationStats].inserted = sourceData.length;
    return;
  }

  // Transform data if needed
  const dataToInsert = transformFn
    ? sourceData.map(row => transformFn(row))
    : sourceData;

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < dataToInsert.length; i += batchSize) {
    const batch = dataToInsert.slice(i, i + batchSize);

    const { error: insertError } = await targetClient
      .from(tableName)
      .upsert(batch, { onConflict: 'id' });

    if (insertError) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError);
      stats[tableName as keyof MigrationStats].errors += batch.length;
    } else {
      stats[tableName as keyof MigrationStats].inserted += batch.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} rows)`);
    }
  }

  console.log(`✅ Migration complete for ${tableName}`);
}

async function validateTargetSchema(): Promise<boolean> {
  console.log('\n🔍 Validating target schema...');

  const tables = ['users', 'leave_requests', 'toil_entries'];

  for (const table of tables) {
    const { error } = await targetClient
      .from(table)
      .select('id')
      .limit(1);

    if (error) {
      console.error(`❌ Table ${table} not found or not accessible:`, error.message);
      return false;
    }
  }

  console.log('✅ All tables exist and are accessible');
  return true;
}

async function clearTargetData(): Promise<void> {
  if (config.dryRun) {
    console.log('🔍 DRY RUN: Would clear target data');
    return;
  }

  console.log('\n🗑️  Clearing existing data in target...');

  // Delete in reverse order to respect foreign keys
  const tables = ['toil_entries', 'leave_requests', 'users'];

  for (const table of tables) {
    const { error } = await targetClient
      .from(table)
      .delete()
      .neq('id', '');  // Delete all rows

    if (error) {
      console.error(`❌ Error clearing ${table}:`, error);
    } else {
      console.log(`✅ Cleared ${table}`);
    }
  }
}

async function verifyMigration(): Promise<void> {
  console.log('\n✅ Verifying migration...');
  console.log('─'.repeat(50));

  const tables = ['users', 'leave_requests', 'toil_entries'];

  for (const table of tables) {
    const { count: sourceCount, error: sourceError } = await sourceClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    const { count: targetCount, error: targetError } = await targetClient
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (sourceError || targetError) {
      console.error(`❌ Error verifying ${table}`);
      continue;
    }

    const match = sourceCount === targetCount;
    const icon = match ? '✅' : '⚠️';
    console.log(`${icon} ${table}: source=${sourceCount}, target=${targetCount}`);
  }
}

// =====================================================
// MAIN MIGRATION FLOW
// =====================================================

async function runMigration(): Promise<void> {
  try {
    // Step 1: Validate target schema
    const schemaValid = await validateTargetSchema();
    if (!schemaValid) {
      console.error('\n❌ Schema validation failed');
      console.error('Please apply database migrations to the target project first');
      console.error(`Run the SQL migrations in ${targetEnvFile} project`);
      process.exit(1);
    }

    // Step 2: Ask for confirmation to clear existing data
    if (!config.dryRun) {
      console.log('\n⚠️  WARNING: This will DELETE all existing data in the target project!');
      console.log(`Target: ${config.target.url} (${targetEnv})`);
      console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      await clearTargetData();
    }

    // Step 3: Migrate users table
    await migrateTable('users');

    // Step 4: Migrate leave_requests table
    await migrateTable('leave_requests');

    // Step 5: Migrate toil_entries table
    await migrateTable('toil_entries');

    // Step 6: Verify migration
    if (!config.dryRun) {
      await verifyMigration();
    }

    // Step 7: Print summary
    console.log('\n📊 Migration Summary');
    console.log('═'.repeat(50));
    console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log(`Target: ${targetEnv}`);
    console.log('');

    Object.entries(stats).forEach(([table, tableStats]) => {
      console.log(`${table}:`);
      console.log(`  Fetched: ${tableStats.fetched}`);
      console.log(`  Inserted: ${tableStats.inserted}`);
      console.log(`  Errors: ${tableStats.errors}`);
    });

    const totalFetched = Object.values(stats).reduce((sum, s) => sum + s.fetched, 0);
    const totalInserted = Object.values(stats).reduce((sum, s) => sum + s.inserted, 0);
    const totalErrors = Object.values(stats).reduce((sum, s) => sum + s.errors, 0);

    console.log('');
    console.log(`Total fetched: ${totalFetched}`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total errors: ${totalErrors}`);

    if (totalErrors > 0) {
      console.log('\n⚠️  Migration completed with errors');
      process.exit(1);
    } else if (config.dryRun) {
      console.log('\n✅ Dry run completed successfully');
      console.log('Run without --dry-run to perform actual migration');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
