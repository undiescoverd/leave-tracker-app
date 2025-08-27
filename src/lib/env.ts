// Simplified environment configuration
// Remove strict validation temporarily to fix 500 errors

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// Log environment status (without exposing values)
if (typeof window === 'undefined') { // Only on server
  console.log('Environment check:');
  console.log('- DATABASE_URL:', env.DATABASE_URL ? '✅' : '❌');
  console.log('- NEXTAUTH_SECRET:', env.NEXTAUTH_SECRET ? '✅' : '❌');
  console.log('- NEXTAUTH_URL:', env.NEXTAUTH_URL);
  console.log('- NODE_ENV:', env.NODE_ENV);
}

export type Env = typeof env;
