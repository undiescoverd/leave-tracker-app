/**
 * Diagnostic script to test API implementation
 * Run with: npx tsx scripts/diagnose-api.ts
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('🔍 Starting API Implementation Diagnostics...\n');

// Test 1: Check environment
console.log('1️⃣ Checking Environment Variables:');
const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
let envOk = true;

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: Set`);
  } else {
    console.log(`   ❌ ${varName}: Missing`);
    envOk = false;
  }
});

// Test 2: Check if files exist
console.log('\n2️⃣ Checking File Existence:');
const fs = require('fs');

const requiredFiles = [
  'src/lib/api/response.ts',
  'src/lib/api/errors.ts',
  'src/lib/api/validation.ts',
  'src/middleware/error-handler.ts',
  'src/app/api/test/route.ts',
  'src/lib/prisma.ts',
  'src/lib/env.ts',
];

let filesOk = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - Missing`);
    filesOk = false;
  }
});

// Test 3: Try to import modules
console.log('\n3️⃣ Testing Module Imports:');
let importsOk = true;

async function testImports() {
  try {
    console.log('   Testing response.ts...');
    const response = await import('../src/lib/api/response');
    console.log('   ✅ response.ts imports successfully');
  } catch (error: any) {
    console.log(`   ❌ response.ts import failed: ${error.message}`);
    importsOk = false;
  }

  try {
    console.log('   Testing errors.ts...');
    const errors = await import('../src/lib/api/errors');
    console.log('   ✅ errors.ts imports successfully');
  } catch (error: any) {
    console.log(`   ❌ errors.ts import failed: ${error.message}`);
    importsOk = false;
  }

  try {
    console.log('   Testing validation.ts...');
    const validation = await import('../src/lib/api/validation');
    console.log('   ✅ validation.ts imports successfully');
  } catch (error: any) {
    console.log(`   ❌ validation.ts import failed: ${error.message}`);
    importsOk = false;
  }

  try {
    console.log('   Testing error-handler.ts...');
    const errorHandler = await import('../src/middleware/error-handler');
    console.log('   ✅ error-handler.ts imports successfully');
  } catch (error: any) {
    console.log(`   ❌ error-handler.ts import failed: ${error.message}`);
    importsOk = false;
  }
}

// Test 4: Check Prisma
console.log('\n4️⃣ Testing Prisma Connection:');
async function testPrisma() {
  try {
    const { prisma } = await import('../src/lib/prisma');
    const count = await prisma.user.count();
    console.log(`   ✅ Prisma connected - Found ${count} users`);
    await prisma.$disconnect();
  } catch (error: any) {
    console.log(`   ❌ Prisma connection failed: ${error.message}`);
  }
}

// Run async tests
(async () => {
  await testImports();
  await testPrisma();
  
  // Summary
  console.log('\n📊 Diagnostic Summary:');
  console.log('========================');
  console.log(`Environment: ${envOk ? '✅ OK' : '❌ Issues Found'}`);
  console.log(`Files: ${filesOk ? '✅ All Present' : '❌ Missing Files'}`);
  console.log(`Imports: ${importsOk ? '✅ Working' : '❌ Import Errors'}`);
  
  if (!envOk || !filesOk || !importsOk) {
    console.log('\n⚠️  Fix the issues above before starting the dev server.');
    process.exit(1);
  } else {
    console.log('\n✅ All diagnostics passed! Try running npm run dev again.');
    process.exit(0);
  }
})();
