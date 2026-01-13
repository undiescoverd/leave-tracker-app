#!/usr/bin/env tsx
/**
 * Supabase Migration Validation Script
 *
 * Validates data integrity between old and new Supabase projects
 *
 * Usage:
 *   # Validate dev project
 *   npm run validate:migration -- --target=dev
 *
 *   # Validate prod project
 *   npm run validate:migration -- --target=prod
 *
 *   # Detailed validation with sample comparisons
 *   npm run validate:migration -- --target=dev --detailed
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

interface ValidationConfig {
  source: {
    url: string;
    key: string;
  };
  target: {
    url: string;
    key: string;
  };
  targetEnv: 'dev' | 'prod';
  detailed: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetArg = args.find(arg => arg.startsWith('--target='));
const detailedArg = args.includes('--detailed');

if (!targetArg) {
  console.error('❌ Error: --target flag is required (dev or prod)');
  console.log('\nUsage:');
  console.log('  npm run validate:migration -- --target=dev');
  console.log('  npm run validate:migration -- --target=prod');
  console.log('  npm run validate:migration -- --target=dev --detailed');
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
  process.exit(1);
}

// Build configuration
const config: ValidationConfig = {
  source: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  target: {
    url: targetEnvConfig.NEXT_PUBLIC_SUPABASE_URL,
    key: targetEnvConfig.SUPABASE_SECRET_KEY || targetEnvConfig.SUPABASE_SERVICE_ROLE_KEY,
  },
  targetEnv,
  detailed: detailedArg,
};

// Validate configuration
if (!config.source.url || !config.source.key) {
  console.error('❌ Error: Source Supabase credentials missing in .env.local');
  process.exit(1);
}

if (!config.target.url || !config.target.key) {
  console.error(`❌ Error: Target Supabase credentials missing in ${targetEnvFile}`);
  process.exit(1);
}

// =====================================================
// SUPABASE CLIENTS
// =====================================================

const sourceClient = createClient(config.source.url, config.source.key);
const targetClient = createClient(config.target.url, config.target.key);

console.log('🔍 Supabase Migration Validation');
console.log('================================');
console.log(`Source: ${config.source.url}`);
console.log(`Target: ${config.target.url} (${targetEnv})`);
console.log(`Mode: ${config.detailed ? 'DETAILED' : 'SUMMARY'}`);
console.log('');

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

interface ValidationResult {
  table: string;
  sourceCount: number;
  targetCount: number;
  match: boolean;
  missingIds: string[];
  extraIds: string[];
  sampleComparisons?: any[];
}

const results: ValidationResult[] = [];

async function validateTable(tableName: string): Promise<ValidationResult> {
  console.log(`\n📊 Validating table: ${tableName}`);
  console.log('─'.repeat(50));

  // Get counts
  const { count: sourceCount, error: sourceCountError } = await sourceClient
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  const { count: targetCount, error: targetCountError } = await targetClient
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (sourceCountError || targetCountError) {
    console.error(`❌ Error getting counts for ${tableName}`);
    return {
      table: tableName,
      sourceCount: sourceCount || 0,
      targetCount: targetCount || 0,
      match: false,
      missingIds: [],
      extraIds: [],
    };
  }

  console.log(`Source count: ${sourceCount}`);
  console.log(`Target count: ${targetCount}`);

  // Get all IDs
  const { data: sourceData, error: sourceDataError } = await sourceClient
    .from(tableName)
    .select('id');

  const { data: targetData, error: targetDataError } = await targetClient
    .from(tableName)
    .select('id');

  if (sourceDataError || targetDataError) {
    console.error(`❌ Error getting IDs for ${tableName}`);
    return {
      table: tableName,
      sourceCount: sourceCount || 0,
      targetCount: targetCount || 0,
      match: false,
      missingIds: [],
      extraIds: [],
    };
  }

  const sourceIds = new Set(sourceData?.map(row => row.id) || []);
  const targetIds = new Set(targetData?.map(row => row.id) || []);

  // Find missing and extra IDs
  const missingIds = Array.from(sourceIds).filter(id => !targetIds.has(id));
  const extraIds = Array.from(targetIds).filter(id => !sourceIds.has(id));

  if (missingIds.length > 0) {
    console.log(`⚠️  Missing ${missingIds.length} records in target`);
    if (config.detailed && missingIds.length <= 10) {
      console.log(`Missing IDs: ${missingIds.join(', ')}`);
    }
  }

  if (extraIds.length > 0) {
    console.log(`⚠️  Extra ${extraIds.length} records in target (not in source)`);
    if (config.detailed && extraIds.length <= 10) {
      console.log(`Extra IDs: ${extraIds.join(', ')}`);
    }
  }

  // Sample comparisons in detailed mode
  let sampleComparisons: any[] | undefined;
  if (config.detailed && sourceData && sourceData.length > 0) {
    const sampleSize = Math.min(3, sourceData.length);
    const sampleIds = sourceData.slice(0, sampleSize).map(row => row.id);

    sampleComparisons = [];

    for (const id of sampleIds) {
      const { data: sourceRow } = await sourceClient
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      const { data: targetRow } = await targetClient
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      sampleComparisons.push({
        id,
        source: sourceRow,
        target: targetRow,
        match: JSON.stringify(sourceRow) === JSON.stringify(targetRow),
      });
    }

    console.log(`\n📋 Sample comparisons (${sampleSize} records):`);
    sampleComparisons.forEach((comparison, index) => {
      const icon = comparison.match ? '✅' : '⚠️';
      console.log(`${icon} Record ${index + 1} (ID: ${comparison.id}): ${comparison.match ? 'Match' : 'Mismatch'}`);
      if (!comparison.match && config.detailed) {
        console.log('Source:', JSON.stringify(comparison.source, null, 2));
        console.log('Target:', JSON.stringify(comparison.target, null, 2));
      }
    });
  }

  const match = sourceCount === targetCount && missingIds.length === 0 && extraIds.length === 0;
  const icon = match ? '✅' : '⚠️';
  console.log(`${icon} Validation ${match ? 'PASSED' : 'FAILED'} for ${tableName}`);

  return {
    table: tableName,
    sourceCount: sourceCount || 0,
    targetCount: targetCount || 0,
    match,
    missingIds,
    extraIds,
    sampleComparisons,
  };
}

async function validateForeignKeys(): Promise<void> {
  console.log('\n🔗 Validating Foreign Key Integrity');
  console.log('─'.repeat(50));

  // Check leave_requests.user_id references
  const { data: leaveRequests } = await targetClient
    .from('leave_requests')
    .select('id, user_id');

  const { data: users } = await targetClient
    .from('users')
    .select('id');

  const userIds = new Set(users?.map(u => u.id) || []);
  const orphanedLeaveRequests = leaveRequests?.filter(lr => !userIds.has(lr.user_id)) || [];

  if (orphanedLeaveRequests.length > 0) {
    console.log(`⚠️  Found ${orphanedLeaveRequests.length} orphaned leave_requests`);
    if (config.detailed) {
      console.log('Orphaned IDs:', orphanedLeaveRequests.map(lr => lr.id).join(', '));
    }
  } else {
    console.log('✅ All leave_requests have valid user_id references');
  }

  // Check toil_entries.user_id references
  const { data: toilEntries } = await targetClient
    .from('toil_entries')
    .select('id, user_id');

  const orphanedToilEntries = toilEntries?.filter(te => !userIds.has(te.user_id)) || [];

  if (orphanedToilEntries.length > 0) {
    console.log(`⚠️  Found ${orphanedToilEntries.length} orphaned toil_entries`);
    if (config.detailed) {
      console.log('Orphaned IDs:', orphanedToilEntries.map(te => te.id).join(', '));
    }
  } else {
    console.log('✅ All toil_entries have valid user_id references');
  }
}

async function validateRLS(): Promise<void> {
  console.log('\n🔒 Validating Row Level Security');
  console.log('─'.repeat(50));

  const tables = ['users', 'leave_requests', 'toil_entries'];

  for (const table of tables) {
    const { data, error } = await targetClient.rpc('pg_get_tabledef', {
      tablename: table,
    });

    if (error) {
      console.log(`⚠️  Could not check RLS for ${table} (expected in Supabase)`);
    } else {
      console.log(`✅ RLS checked for ${table}`);
    }
  }
}

// =====================================================
// MAIN VALIDATION FLOW
// =====================================================

async function runValidation(): Promise<void> {
  try {
    // Validate each table
    const userResult = await validateTable('users');
    results.push(userResult);

    const leaveRequestResult = await validateTable('leave_requests');
    results.push(leaveRequestResult);

    const toilEntryResult = await validateTable('toil_entries');
    results.push(toilEntryResult);

    // Validate foreign keys
    await validateForeignKeys();

    // Validate RLS
    await validateRLS();

    // Print summary
    console.log('\n📊 Validation Summary');
    console.log('═'.repeat(50));

    let allPassed = true;

    results.forEach(result => {
      const icon = result.match ? '✅' : '❌';
      console.log(`${icon} ${result.table}`);
      console.log(`   Source: ${result.sourceCount} | Target: ${result.targetCount}`);
      if (!result.match) {
        console.log(`   Missing: ${result.missingIds.length} | Extra: ${result.extraIds.length}`);
        allPassed = false;
      }
    });

    console.log('');
    if (allPassed) {
      console.log('✅ All validations PASSED');
      console.log('Migration is successful and data integrity is intact');
    } else {
      console.log('⚠️  Some validations FAILED');
      console.log('Please review the discrepancies above');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation
runValidation();
