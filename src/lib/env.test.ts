// This file is for testing environment validation
// It will throw an error if required environment variables are missing

import { env } from './env';

// This will validate all environment variables on import
console.log('✅ Environment validation passed');
console.log('📊 Environment variables loaded:');
console.log('- DATABASE_URL:', env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- NEXTAUTH_SECRET:', env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
console.log('- NEXTAUTH_URL:', env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing');
console.log('- NODE_ENV:', env.NODE_ENV);

export { env };
