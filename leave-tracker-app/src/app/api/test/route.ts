import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simplified test route - minimal imports for debugging
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Count users to test query
    const userCount = await prisma.user.count();
    
    return NextResponse.json({ 
      success: true,
      status: 'healthy', 
      message: 'Database connection successful',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'POST test working',
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process POST',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}
