import { NextRequest, NextResponse } from 'next/server';
import { env, envValidation } from '@/lib/env';
import { EmailService } from '@/lib/email/service';
import { supabaseAdmin } from '@/lib/supabase';

// Health check levels
type HealthLevel = 'basic' | 'detailed' | 'deep';

interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'unknown';
      details?: any;
    };
    email: {
      status: 'configured' | 'misconfigured' | 'disabled';
      details?: any;
    };
    authentication: {
      status: 'configured' | 'misconfigured';
      details?: any;
    };
  };
  configuration: {
    validation: 'passed' | 'failed';
    missing?: string[];
  };
  metrics?: {
    memory: any;
    performance: any;
  };
}

async function checkDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected' | 'unknown'; details?: any }> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 'disconnected', details: { error: 'Supabase credentials not configured' } };
  }

  try {
    // Test Supabase connectivity with a simple query
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1)
      .single();

    // PGRST116 is "not found" which is acceptable - means table exists but no data
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    return { status: 'connected', details: { provider: 'Supabase (PostgreSQL)' } };
  } catch (error: any) {
    return {
      status: 'disconnected',
      details: { error: error.message?.substring(0, 100) || 'Supabase connection failed' }
    };
  }
}

async function performHealthCheck(level: HealthLevel = 'basic'): Promise<HealthResult> {
  const startTime = Date.now();

  // Basic health data
  const result: HealthResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    services: {
      database: { status: 'disconnected' as const },
      email: { status: 'configured' as const },
      authentication: { status: 'configured' as const },
    },
    configuration: {
      validation: envValidation.validationPassed ? 'passed' : 'failed',
    },
  };

  // Check authentication configuration
  result.services.authentication = {
    status: envValidation.hasAuth ? 'configured' : 'misconfigured',
    details: {
      hasSecret: !!env.NEXTAUTH_SECRET,
      url: env.NEXTAUTH_URL,
    },
  };

  // Email service health check
  if (level !== 'basic') {
    const emailHealth = await EmailService.healthCheck();
    result.services.email = {
      status: emailHealth.healthy ? 'configured' :
              env.ENABLE_EMAIL_NOTIFICATIONS === 'false' ? 'disabled' : 'misconfigured',
      details: emailHealth.details,
    };
  } else {
    result.services.email = {
      status: envValidation.hasEmail ? 'configured' : 'disabled',
    };
  }

  // Database connectivity check (for detailed and deep levels)
  if (level === 'detailed' || level === 'deep') {
    result.services.database = await checkDatabaseHealth();
  } else {
    result.services.database = {
      status: env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY ? 'connected' : 'disconnected',
    };
  }

  // Deep health check with metrics
  if (level === 'deep') {
    result.metrics = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      performance: {
        healthCheckDuration: Date.now() - startTime,
        nodeVersion: process.version,
      },
    };
  }

  // Determine overall status
  const services = Object.values(result.services);
  if (services.some(s => s.status === 'disconnected' || s.status === 'misconfigured')) {
    result.status = services.every(s => s.status !== 'disconnected') ? 'degraded' : 'unhealthy';
  }

  return result;
}

async function healthCheckHandler(request: NextRequest) {
  // Check for health check token in production
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token');

  if (envValidation.isProduction && env.HEALTH_CHECK_TOKEN && token !== env.HEALTH_CHECK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized health check' }, { status: 401 });
  }

  // Get health check level from query parameter
  const level = (request.nextUrl.searchParams.get('level') as HealthLevel) || 'basic';

  const healthResult = await performHealthCheck(level);

  // Return appropriate HTTP status based on health
  const statusCode = healthResult.status === 'healthy' ? 200 :
                    healthResult.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthResult, { status: statusCode });
}

import { withErrorHandler, composeMiddleware, withPerformanceMonitoring } from '@/middleware/error-handler';

// Compose middleware for the GET handler
export const GET = composeMiddleware(
  withErrorHandler,
  withPerformanceMonitoring
)(healthCheckHandler);
