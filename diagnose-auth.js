// NextAuth Diagnostic Script
console.log('🔍 NextAuth Environment Diagnostic\n');

// Check critical environment variables
const requiredVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
  'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
  'NODE_ENV': process.env.NODE_ENV
};

console.log('📋 Environment Variables:');
Object.entries(requiredVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = key === 'DATABASE_URL' || key === 'NEXTAUTH_SECRET' 
    ? (value ? '[SET]' : '[NOT SET]') 
    : value || '[NOT SET]';
  console.log(`${status} ${key}: ${displayValue}`);
});

// Check if running in development
const isDev = process.env.NODE_ENV === 'development';
console.log(`\n🌐 Environment: ${isDev ? 'Development' : 'Production'}`);

// Check for common issues
console.log('\n🚨 Common Issues Check:');

if (!process.env.NEXTAUTH_SECRET) {
  console.log('❌ NEXTAUTH_SECRET missing - This causes ClientFetchError');
  console.log('   Fix: Add NEXTAUTH_SECRET to your .env.local file');
}

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL missing - Authentication will fail');
  console.log('   Fix: Add DATABASE_URL to your .env.local file');
}

if (!process.env.NEXTAUTH_URL && !isDev) {
  console.log('❌ NEXTAUTH_URL missing in production');
  console.log('   Fix: Add NEXTAUTH_URL to your environment');
}

// TOIL feature flags check
console.log('\n🎯 TOIL Feature Flags:');
const toilFlags = {
  'NEXT_PUBLIC_TOIL_ENABLED': process.env.NEXT_PUBLIC_TOIL_ENABLED,
  'NEXT_PUBLIC_TOIL_REQUEST': process.env.NEXT_PUBLIC_TOIL_REQUEST,
  'NEXT_PUBLIC_TOIL_ADMIN': process.env.NEXT_PUBLIC_TOIL_ADMIN
};

Object.entries(toilFlags).forEach(([key, value]) => {
  const status = value === 'true' ? '✅' : (value === 'false' ? '⚠️' : '❌');
  console.log(`${status} ${key}: ${value || '[NOT SET]'}`);
});

console.log('\n📝 Next Steps:');
if (!process.env.NEXTAUTH_SECRET || !process.env.DATABASE_URL) {
  console.log('1. Create .env.local file in project root');
  console.log('2. Add the missing environment variables');
  console.log('3. Restart your development server');
  console.log('4. See env-setup-instructions.md for details');
} else {
  console.log('✅ Environment looks good!');
  console.log('If still experiencing issues, check:');
  console.log('- Database connection');
  console.log('- Network connectivity');
  console.log('- NextAuth API route (/api/auth/[...nextauth])');
}