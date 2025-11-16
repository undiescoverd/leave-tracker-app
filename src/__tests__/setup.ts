import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Mock console methods for cleaner test output
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    // Keep error and warn for debugging
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as Console;
});

// Mock Next.js specific modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test',
}));

// Mock NextAuth
jest.mock('next-auth', () => ({
  default: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'USER'
    }
  })),
}));

// Mock Prisma for isolated unit tests
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    toilEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

// Global test utilities
interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  annualLeaveBalance: number;
  toilBalance: number;
  sickLeaveBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TestLeaveRequest {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  comments: string;
  hours: number | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  const testUtils: {
    mockUser: (overrides?: Partial<TestUser>) => TestUser;
    mockLeaveRequest: (overrides?: Partial<TestLeaveRequest>) => TestLeaveRequest;
    mockPrismaResponse: <T>(data: T) => Promise<T>;
  };
}

global.testUtils = {
  mockUser: (overrides = {}) => ({
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    annualLeaveBalance: 32,
    toilBalance: 0,
    sickLeaveBalance: 3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }),

  mockLeaveRequest: (overrides = {}) => ({
    id: 'req-1',
    userId: 'test-user-1',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-05'),
    type: 'ANNUAL',
    status: 'PENDING',
    comments: 'Summer vacation',
    hours: null,
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-05-01'),
    ...overrides
  }),

  mockPrismaResponse: <T>(data: T) => Promise.resolve(data),
};