import { NextRequest, NextResponse } from 'next/server';
import { env, envValidation } from '@/lib/env';
import { performProductionReadinessCheck } from '@/lib/production-readiness';

export async function GET(request: NextRequest) {
  try {
    // Authentication check for production
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token');
    
    if (envValidation.isProduction && env.HEALTH_CHECK_TOKEN && token !== env.HEALTH_CHECK_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized readiness check' }, { status: 401 });
    }

    const readinessReport = await performProductionReadinessCheck();
    
    // Return appropriate HTTP status based on readiness
    const statusCode = readinessReport.overall === 'ready' ? 200 :
                      readinessReport.overall === 'warnings' ? 200 : 503;
    
    return NextResponse.json(readinessReport, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    console.error('Readiness check error:', error);
    return NextResponse.json({
      overall: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
      environment: env.NODE_ENV,
    }, { status: 503 });
  }
}