// Environment configuration with email support
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("onboarding@resend.dev"),
  EMAIL_REPLY_TO: z.string().email().default("admin@tdhagency.com"),
  ENABLE_EMAIL_NOTIFICATIONS: z.enum(["true", "false"]).default("false"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS,
});

// Log environment status (without exposing values)
if (typeof window === 'undefined') { // Only on server
  console.log('Environment check:');
  console.log('- DATABASE_URL:', env.DATABASE_URL ? '✅' : '❌');
  console.log('- NEXTAUTH_SECRET:', env.NEXTAUTH_SECRET ? '✅' : '❌');
  console.log('- NEXTAUTH_URL:', env.NEXTAUTH_URL);
  console.log('- NODE_ENV:', env.NODE_ENV);
}

export type Env = typeof env;
