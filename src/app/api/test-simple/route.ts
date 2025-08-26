/**
 * Simplified Test Route - Minimal dependencies for debugging
 * File: src/app/api/test-simple/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple test without any custom imports
export async function GET(request: NextRequest) {
  try {
    // Test basic functionality
    const response = {
      success: true,
      message: 'Simple test endpoint working',
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test endpoint error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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
