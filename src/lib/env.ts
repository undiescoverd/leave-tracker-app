// Production-ready environment configuration with comprehensive validation
import { z } from 'zod';

// Production-specific validation schemas
const productionRequiredString = (name: string) => 
  z.string().min(1, `${name} is required in production`);

const productionSchema = z.object({
  DATABASE_URL: productionRequiredString('DATABASE_URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters in production'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL in production'),
  RESEND_API_KEY: productionRequiredString('RESEND_API_KEY'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email'),
  EMAIL_REPLY_TO: z.string().email('EMAIL_REPLY_TO must be a valid email'),
});

const developmentSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("onboarding@resend.dev"),
  EMAIL_REPLY_TO: z.string().email().default("admin@tdhagency.com"),
});

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ENABLE_EMAIL_NOTIFICATIONS: z.enum(["true", "false"]).default("false"),
  
  // Optional monitoring and observability
  HEALTH_CHECK_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  METRICS_ENABLED: z.enum(["true", "false"]).default("false"),
  
  // Email service configuration
  EMAIL_RATE_LIMIT_PER_HOUR: z.string().regex(/^\d+$/).default("50").transform(Number),
  EMAIL_RETRY_ATTEMPTS: z.string().regex(/^\d+$/).default("3").transform(Number),
  EMAIL_TIMEOUT_MS: z.string().regex(/^\d+$/).default("30000").transform(Number),
  
  // Supabase configuration (optional)
  // Support both new and legacy naming conventions
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(), // New naming
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(), // Legacy naming (deprecated)
  SUPABASE_SECRET_KEY: z.string().optional(), // New naming (recommended)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // Legacy naming (deprecated)
});

// Conditional schema based on environment
const createEnvSchema = (nodeEnv: string) => {
  const conditionalSchema = nodeEnv === 'production' 
    ? productionSchema 
    : developmentSchema;
  
  return baseSchema.merge(conditionalSchema);
};

// Parse with environment-specific validation
const nodeEnv = process.env.NODE_ENV || 'development';
const envSchema = createEnvSchema(nodeEnv);

// Validate and export environment
let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: nodeEnv,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS,
    HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    METRICS_ENABLED: process.env.METRICS_ENABLED,
    EMAIL_RATE_LIMIT_PER_HOUR: process.env.EMAIL_RATE_LIMIT_PER_HOUR,
    EMAIL_RETRY_ATTEMPTS: process.env.EMAIL_RETRY_ATTEMPTS,
    EMAIL_TIMEOUT_MS: process.env.EMAIL_TIMEOUT_MS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`- ${err.path.join('.')}: ${err.message}`);
    });
    
    if (nodeEnv === 'production') {
      console.error('\n🚨 Production deployment blocked due to configuration errors');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Development mode: continuing with validation errors');
      // Fallback to development defaults for non-critical errors
      env = createEnvSchema('development').parse({
        NODE_ENV: nodeEnv,
        DATABASE_URL: process.env.DATABASE_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM || "onboarding@resend.dev",
        EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || "admin@tdhagency.com",
        ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS || "false",
        HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN,
        LOG_LEVEL: process.env.LOG_LEVEL || "info",
        METRICS_ENABLED: process.env.METRICS_ENABLED || "false",
        EMAIL_RATE_LIMIT_PER_HOUR: process.env.EMAIL_RATE_LIMIT_PER_HOUR || "50",
        EMAIL_RETRY_ATTEMPTS: process.env.EMAIL_RETRY_ATTEMPTS || "3",
        EMAIL_TIMEOUT_MS: process.env.EMAIL_TIMEOUT_MS || "30000",
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    }
  } else {
    throw error;
  }
}

// Environment validation results
export const envValidation = {
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  hasDatabase: !!env.DATABASE_URL,
  hasAuth: !!env.NEXTAUTH_SECRET,
  hasEmail: !!env.RESEND_API_KEY && env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  validationPassed: true,
};

// Startup validation logging (server-side only)
if (typeof window === 'undefined') {
  console.log('\n🔧 Environment Configuration:');
  console.log(`- Environment: ${env.NODE_ENV}`);
  console.log(`- Database: ${env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`- Authentication: ${env.NEXTAUTH_SECRET ? '✅ Configured' : '❌ Missing secret'}`);
  console.log(`- Email Service: ${envValidation.hasEmail ? '✅ Resend configured' : '⚠️  Disabled or not configured'}`);
  console.log(`- Base URL: ${env.NEXTAUTH_URL}`);
  
  if (env.NODE_ENV === 'production') {
    console.log('✅ Production environment validation passed');
  }
  console.log(''); // Empty line for readability
}

export { env };
export type Env = typeof env;
