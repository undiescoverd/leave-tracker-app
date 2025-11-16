import { PrismaClient } from '@prisma/client';
import { initializePrismaMiddleware } from './prisma-middleware';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' && process.env.VERBOSE_LOGGING === 'true'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Initialize middleware only once
if (!globalForPrisma.prisma) {
  initializePrismaMiddleware(prisma);
  
  // Simplified logging without event handlers due to typing issues
  console.log('Prisma client initialized with logging configuration');
  
  if (process.env.NODE_ENV === 'development' && process.env.VERBOSE_LOGGING === 'true') {
    console.log('Verbose database logging enabled');
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
