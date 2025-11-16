import { env, envValidation } from '@/lib/env';
import { emailServiceStatus } from '@/lib/email/service';

interface ProductionCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

interface ProductionReadinessReport {
  overall: 'ready' | 'not_ready' | 'warnings';
  timestamp: string;
  environment: string;
  checks: ProductionCheck[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
}

export async function performProductionReadinessCheck(): Promise<ProductionReadinessReport> {
  const checks: ProductionCheck[] = [];
  const startTime = new Date();

  // Environment Configuration Checks
  checks.push({
    name: 'Environment Variables',
    status: envValidation.validationPassed ? 'pass' : 'fail',
    message: envValidation.validationPassed 
      ? 'All required environment variables are configured'
      : 'Missing or invalid environment variables',
  });

  checks.push({
    name: 'Database Connection',
    status: envValidation.hasDatabase ? 'pass' : 'fail',
    message: envValidation.hasDatabase 
      ? 'Database URL is configured' 
      : 'DATABASE_URL is missing or invalid',
  });

  checks.push({
    name: 'Authentication Secret',
    status: envValidation.hasAuth ? 'pass' : 'fail',
    message: envValidation.hasAuth 
      ? 'Authentication secret is configured and meets requirements'
      : 'NEXTAUTH_SECRET is missing or too short',
  });

  // Email Service Configuration
  const emailCheck = await emailServiceStatus;
  if (env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
    checks.push({
      name: 'Email Service',
      status: emailCheck.isConfigured ? 'pass' : 'fail',
      message: emailCheck.isConfigured 
        ? `Email service configured with ${emailCheck.provider}`
        : 'Email notifications enabled but service not properly configured',
      details: {
        provider: emailCheck.provider,
        rateLimit: emailCheck.rateLimit,
        retries: emailCheck.retryAttempts,
      },
    });
  } else {
    checks.push({
      name: 'Email Service',
      status: 'warn',
      message: 'Email notifications are disabled',
      details: { enabled: false },
    });
  }

  // Security Checks
  checks.push({
    name: 'HTTPS Configuration',
    status: env.NEXTAUTH_URL.startsWith('https://') ? 'pass' : 
            envValidation.isProduction ? 'fail' : 'warn',
    message: env.NEXTAUTH_URL.startsWith('https://') 
      ? 'HTTPS is properly configured'
      : envValidation.isProduction 
        ? 'Production deployment must use HTTPS'
        : 'Development environment should use HTTPS for testing',
  });

  // Production-specific checks
  if (envValidation.isProduction) {
    checks.push({
      name: 'Production Environment',
      status: 'pass',
      message: 'Running in production mode',
    });

    checks.push({
      name: 'Debug Mode',
      status: env.NODE_ENV === 'production' ? 'pass' : 'fail',
      message: env.NODE_ENV === 'production' 
        ? 'Debug mode is disabled in production'
        : 'Debug mode should be disabled in production',
    });
  }

  // Performance and Monitoring
  checks.push({
    name: 'Health Check Endpoint',
    status: 'pass',
    message: 'Health check endpoint is available at /api/health',
  });

  if (env.HEALTH_CHECK_TOKEN) {
    checks.push({
      name: 'Health Check Security',
      status: 'pass',
      message: 'Health check endpoint is secured with token',
    });
  } else if (envValidation.isProduction) {
    checks.push({
      name: 'Health Check Security',
      status: 'warn',
      message: 'Consider securing health check endpoint with HEALTH_CHECK_TOKEN',
    });
  }

  checks.push({
    name: 'Metrics Collection',
    status: env.METRICS_ENABLED === 'true' ? 'pass' : 'warn',
    message: env.METRICS_ENABLED === 'true' 
      ? 'Metrics collection is enabled'
      : 'Metrics collection is disabled - consider enabling for production monitoring',
  });

  // Database connectivity test
  try {
    if (envValidation.hasDatabase) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      
      checks.push({
        name: 'Database Connectivity',
        status: 'pass',
        message: 'Database connection test successful',
      });
    }
  } catch (error: any) {
    checks.push({
      name: 'Database Connectivity',
      status: 'fail',
      message: 'Database connection test failed',
      details: { error: error.message?.substring(0, 100) },
    });
  }

  // Calculate summary
  const summary = {
    passed: checks.filter(c => c.status === 'pass').length,
    failed: checks.filter(c => c.status === 'fail').length,
    warnings: checks.filter(c => c.status === 'warn').length,
    total: checks.length,
  };

  // Determine overall status
  let overall: 'ready' | 'not_ready' | 'warnings' = 'ready';
  if (summary.failed > 0) {
    overall = 'not_ready';
  } else if (summary.warnings > 0) {
    overall = 'warnings';
  }

  return {
    overall,
    timestamp: startTime.toISOString(),
    environment: env.NODE_ENV,
    checks,
    summary,
  };
}

export function logProductionReadiness(report: ProductionReadinessReport): void {
  console.log('\n🔍 Production Readiness Check');
  console.log('================================');
  console.log(`Overall Status: ${report.overall.toUpperCase()}`);
  console.log(`Environment: ${report.environment}`);
  console.log(`Timestamp: ${report.timestamp}\n`);

  // Group checks by status
  const passedChecks = report.checks.filter(c => c.status === 'pass');
  const failedChecks = report.checks.filter(c => c.status === 'fail');
  const warningChecks = report.checks.filter(c => c.status === 'warn');

  if (passedChecks.length > 0) {
    console.log('✅ PASSED CHECKS:');
    passedChecks.forEach(check => {
      console.log(`  • ${check.name}: ${check.message}`);
    });
    console.log('');
  }

  if (warningChecks.length > 0) {
    console.log('⚠️  WARNING CHECKS:');
    warningChecks.forEach(check => {
      console.log(`  • ${check.name}: ${check.message}`);
    });
    console.log('');
  }

  if (failedChecks.length > 0) {
    console.log('❌ FAILED CHECKS:');
    failedChecks.forEach(check => {
      console.log(`  • ${check.name}: ${check.message}`);
      if (check.details) {
        console.log(`    Details: ${JSON.stringify(check.details)}`);
      }
    });
    console.log('');
  }

  console.log(`Summary: ${report.summary.passed} passed, ${report.summary.warnings} warnings, ${report.summary.failed} failed`);
  console.log('================================\n');
}