import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  hashPassword,
  verifyPassword,
  createUser,
  getUserByEmail
} from '@/lib/auth-utils.supabase';

// Mock Supabase client (handled in setup.ts, but override for this test)
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    auth: {
      admin: {
        createUser: jest.fn(),
      },
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    securityEvent: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'USER',
    },
  }),
}));

import { supabaseAdmin } from '@/lib/supabase';
const mockSupabase = supabaseAdmin as any;

describe('Auth Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Management', () => {
    it('should hash passwords securely', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should verify password correctly', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPassword('wrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('User Creation', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123!',
        name: 'Test User'
      };

      const mockCreatedUser = { ...userData, id: 'user-1', password: 'hashed', role: 'USER' };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockCreatedUser, error: null })
        })
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      });

      const result = await createUser(userData);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(result).toBeDefined();
    });

    it('should create admin user when role specified', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'password123!',
        name: 'Admin User',
        role: 'ADMIN' as const
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...userData, id: 'admin-1' },
            error: null
          })
        })
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      });

      await createUser(userData);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should get user by email', async () => {
      const email = 'test@example.com';
      const mockUser = testUtils.mockUser({ email });

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });

      const result = await getUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return null for non-existent user', async () => {
      const email = 'nonexistent@example.com';

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const result = await getUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('Password Validation', () => {
    it('should handle bcrypt comparison correctly', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashPassword(password);

      // Correct password verification
      const validResult = await verifyPassword(password, hashedPassword);
      expect(validResult).toBe(true);

      // Incorrect password verification
      const invalidResult = await verifyPassword(wrongPassword, hashedPassword);
      expect(invalidResult).toBe(false);
    });

    it('should handle empty passwords securely', async () => {
      const emptyPassword = '';
      const hashedPassword = await hashPassword('realpassword');

      const result = await verifyPassword(emptyPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle malformed hash gracefully', async () => {
      const password = 'password123';
      const malformedHash = 'not-a-valid-hash';

      // bcrypt.compare returns false for malformed hashes rather than throwing
      const result = await verifyPassword(password, malformedHash);
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database connection errors', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123!',
        name: 'Test User'
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB Connection failed' }
            })
          })
        })
      });

      await expect(createUser(userData)).rejects.toThrow('DB Connection failed');
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(200);
      const hashedPassword = await hashPassword(longPassword);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(50);

      const isValid = await verifyPassword(longPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const hashedPassword = await hashPassword(specialPassword);

      expect(hashedPassword).toBeDefined();

      const isValid = await verifyPassword(specialPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in user data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123!',
        name: 'Tëst Üser 测试' // Unicode characters
      };

      const mockCreatedUser = { ...userData, id: 'user-1', role: 'USER' };

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedUser, error: null })
          })
        })
      });

      const result = await createUser(userData);

      expect(result).toBeDefined();
      if (result) {
        expect(result.name).toBe('Tëst Üser 测试');
      }
    });
  });

  describe('Performance', () => {
    it('should hash passwords within reasonable time', async () => {
      const password = 'testPassword123!';
      
      const startTime = Date.now();
      await hashPassword(password);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should complete within 1 second (bcrypt is intentionally slow)
      expect(duration).toBeLessThan(1000);
    });

    it('should verify passwords within reasonable time', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const startTime = Date.now();
      await verifyPassword(password, hashedPassword);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Verification should be faster than hashing
      expect(duration).toBeLessThan(500);
    });
  });
});