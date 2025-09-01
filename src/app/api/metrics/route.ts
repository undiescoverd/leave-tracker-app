import { NextRequest, NextResponse } from 'next/server';
import { env, envValidation } from '@/lib/env';
import { emailServiceStatus } from '@/lib/email/service';

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    free: number;
    external: number;
  };
  process: {
    pid: number;
    version: string;
    platform: string;
    arch: string;
  };
  environment: {
    nodeEnv: string;
    isProduction: boolean;
  };
  services: {
    email: {
      configured: boolean;
      provider: string;
      rateLimit: number;
    };
    database: {
      configured: boolean;
    };
  };
}

function collectMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  
  return {
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    environment: {
      nodeEnv: env.NODE_ENV,
      isProduction: envValidation.isProduction,
    },
    services: {
      email: {
        configured: emailServiceStatus.isConfigured,
        provider: emailServiceStatus.provider,
        rateLimit: emailServiceStatus.rateLimit,
      },
      database: {
        configured: envValidation.hasDatabase,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check for production
    if (envValidation.isProduction) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token');
      
      if (env.HEALTH_CHECK_TOKEN && token !== env.HEALTH_CHECK_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Only enable metrics if explicitly configured
    if (env.METRICS_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Metrics disabled' }, { status: 404 });
    }

    const metrics = collectMetrics();
    
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Metrics collection error:', error);
    return NextResponse.json({
      error: 'Metrics collection failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}