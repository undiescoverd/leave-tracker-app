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

// Mock Supabase for isolated unit tests
const mockSupabaseQuery = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve) => resolve({ data: null, error: null })),
});

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => mockSupabaseQuery()),
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        getUserById: jest.fn(),
      },
    },
  },
  createClient: jest.fn(() => ({
    from: jest.fn(() => mockSupabaseQuery()),
  })),
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
  mockSupabaseResponse: <T>(data: T) => ({ data, error: null }),
  mockSupabaseError: (message: string) => ({ data: null, error: { message, code: 'test_error' } }),
};