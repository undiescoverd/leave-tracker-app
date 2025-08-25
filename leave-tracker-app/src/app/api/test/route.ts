import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Count users to test query
    const userCount = await prisma.user.count()
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Database connection successful',
      userCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
