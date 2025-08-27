import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'not set',
      hasDatabase: !!process.env.DATABASE_URL,
      hasAuth: !!process.env.NEXTAUTH_SECRET,
    }
  });
}
