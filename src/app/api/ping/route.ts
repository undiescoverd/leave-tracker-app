import { NextRequest, NextResponse } from 'next/server';
import { withPublicRateLimit } from '@/lib/middleware/auth.supabase';

async function pingHandler(req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ ping: "pong" });
}

export const GET = withPublicRateLimit(pingHandler);
