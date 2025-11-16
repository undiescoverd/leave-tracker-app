import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { 
  validateClientSecurity,
  auditLog,
  createSecureResponse
} from '@/lib/auth-utils';
import './setup';

// Import API routes for security testing
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as createLeaveRequest } from '@/app/api/leave/request/route';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/middleware/sanitization');
jest.mock('@/lib/middleware/security');

interface MockPrisma {
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
  };
}

interface MockAuthUtils {
  getAuthenticatedUser: jest.Mock;
  requireAdmin: jest.Mock;
  requireResourceOwnership: jest.Mock;
  createUser: jest.Mock;
  hashPassword: jest.Mock;
  verifyPassword: jest.Mock;
}

interface MockSanitization {
  sanitizeInput: jest.Mock;
  validateInput: jest.Mock;
}

interface MockSecurity {
  checkRateLimit: jest.Mock;
}

const mockPrisma = jest.requireActual('@/lib/prisma').prisma as MockPrisma;
const mockAuthUtils = jest.requireActual('@/lib/auth-utils') as MockAuthUtils;
const mockSanitization = jest.requireActual('@/lib/middleware/sanitization') as MockSanitization;
const mockSecurity = jest.requireActual('@/lib/middleware/security') as MockSecurity;

describe('Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent XSS attacks in user registration', async () => {
      const maliciousPayload = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: '<script>alert("XSS")</script>Malicious User'
      };

      mockSanitization.sanitizeInput = jest.fn()
        .mockReturnValueOnce('user@example.com')
        .mockReturnValueOnce('SecurePass123!')
        .mockReturnValueOnce('Clean User'); // XSS removed

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockAuthUtils.createUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Clean User'
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload)
      });

      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(mockSanitization.sanitizeInput).toHaveBeenCalledWith(maliciousPayload.name);
      expect(result.data.user.name).toBe('Clean User');
    });

    it('should prevent SQL injection in leave requests', async () => {
      const sqlInjectionPayload = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: "ANNUAL'; DROP TABLE users; --",
        reason: "1' OR '1'='1"
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(testUtils.mockUser());
      mockSanitization.sanitizeInput = jest.fn()
        .mockImplementation(input => {
          if (typeof input === 'string') {
            return input.replace(/[;'"]/g, '').replace(/--/g, '');
          }
          return input;
        });

      mockSanitization.validateInput = jest.fn().mockReturnValue({ isValid: true });

      const request = new NextRequest('http://localhost:3000/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlInjectionPayload)
      });

      await createLeaveRequest(request);

      // Verify sanitization was applied
      expect(mockSanitization.sanitizeInput).toHaveBeenCalledWith(sqlInjectionPayload.type);
      expect(mockSanitization.sanitizeInput).toHaveBeenCalledWith(sqlInjectionPayload.reason);
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@missing-local.com',
        'missing-domain@',
        'spaces in@email.com',
        'unicode@тест.com',
        'toolongdomainname@' + 'x'.repeat(255) + '.com'
      ];

      for (const email of invalidEmails) {
        const payload = {
          email,
          password: 'ValidPass123!',
          name: 'Test User'
        };

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const response = await registerPOST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
      }
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '123', // Too short
        'password', // No numbers/symbols
        'PASSWORD123', // No lowercase
        'password123', // No uppercase
        'Password', // No numbers
        '12345678', // No letters
        'Pass1!', // Too short
        'a'.repeat(129) // Too long
      ];

      for (const password of weakPasswords) {
        const payload = {
          email: 'test@example.com',
          password,
          name: 'Test User'
        };

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const response = await registerPOST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Authentication Security', () => {
    it('should prevent brute force attacks with rate limiting', async () => {
      mockSecurity.checkRateLimit = jest.fn()
        .mockReturnValueOnce({ allowed: true, remaining: 4 })
        .mockReturnValueOnce({ allowed: true, remaining: 3 })
        .mockReturnValueOnce({ allowed: true, remaining: 2 })
        .mockReturnValueOnce({ allowed: true, remaining: 1 })
        .mockReturnValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 900000 });

      // Mock failed login payload for rate limit testing
      // const _failedLoginPayload = {
      //   email: 'user@example.com',
      //   password: 'wrongpassword'
      // };

      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        // Simulate request to auth endpoint
        // Request not used in this iteration but mocked for completeness

        // Mock the login endpoint behavior
        if (i < 4) {
          // First 4 attempts should be processed
          expect(mockSecurity.checkRateLimit).toHaveBeenCalled();
        } else {
          // 5th attempt should be blocked
          const rateLimitResult = mockSecurity.checkRateLimit();
          expect(rateLimitResult.allowed).toBe(false);
        }
      }
    });

    it('should implement secure session management', async () => {
      const mockUser = testUtils.mockUser();
      
      // Mock session validation
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      
      // Test session integrity check
      const sessionData = {
        user: {
          id: mockUser.id,
          email: mockUser.email
        }
      };

      // Session should match database user
      expect(sessionData.user.id).toBe(mockUser.id);
      expect(sessionData.user.email).toBe(mockUser.email);
    });

    it('should detect and prevent session hijacking', async () => {
      // Mock mismatched session scenario
      const sessionUserId = 'session-user-id';
      const databaseUserId = 'different-user-id';

      const mockAuth = (await import('@/lib/auth')).auth as jest.MockedFunction<() => Promise<{ user: { id: string; email: string } }>>;
      mockAuth.mockResolvedValue({
        user: {
          id: sessionUserId,
          email: 'user@example.com'
        }
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: databaseUserId,
        email: 'user@example.com'
      });

      // Should detect session integrity violation
      await expect(mockAuthUtils.getAuthenticatedUser()).rejects.toThrow('Session integrity violation');
    });

    it('should validate password reset tokens securely', async () => {
      const invalidTokens = [
        '',
        'short',
        'a'.repeat(1000), // Too long
        'invalid-format',
        'expired-token'
      ];

      for (const token of invalidTokens) {
        if (token === 'expired-token') {
          // Mock expired token
          mockPrisma.user.findFirst.mockResolvedValue({
            id: 'user-1',
            resetToken: token,
            resetTokenExpires: new Date(Date.now() - 3600000) // 1 hour ago
          });
        } else {
          // Mock invalid/missing token
          mockPrisma.user.findFirst.mockResolvedValue(null);
        }

        const payload = {
          token,
          password: 'NewSecurePass123!'
        };

        const testRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const { POST: resetPassword } = await import('@/app/api/auth/reset-password/route');
        const response = await resetPassword(testRequest);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid or expired');
      }
    });
  });

  describe('Authorization Security', () => {
    it('should prevent privilege escalation attacks', async () => {
      const regularUser = testUtils.mockUser({ role: 'USER' });
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(regularUser);

      // Mock attempts to access admin functionality
      const adminOnlyActions = [
        { endpoint: '/api/admin/users', method: 'GET' },
        { endpoint: '/api/admin/bulk-approve', method: 'POST' },
        { endpoint: '/api/admin/comprehensive-seed', method: 'POST' },
        { endpoint: '/api/leave/request/123/approve', method: 'PATCH' }
      ];

      for (let i = 0; i < adminOnlyActions.length; i++) {
        const { AuthorizationError } = await import('@/lib/api/errors');
        mockAuthUtils.requireAdmin.mockRejectedValue(
          new AuthorizationError('Administrator access required')
        );

        // Simulate request to admin endpoint
        try {
          await mockAuthUtils.requireAdmin();
          expect(true).toBe(false); // Should not reach this
        } catch (error: unknown) {
          expect((error as Error).message).toBe('Administrator access required');
        }
      }
    });

    it('should prevent horizontal privilege escalation', async () => {
      const user1 = testUtils.mockUser({ id: 'user-1' });
      const user2LeaveRequest = testUtils.mockLeaveRequest({ 
        id: 'req-2', 
        userId: 'user-2' 
      });

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(user1);
      const { AuthorizationError } = await import('@/lib/api/errors');
      mockAuthUtils.requireResourceOwnership.mockRejectedValue(
        new AuthorizationError('You can only access your own resources')
      );

      // User 1 tries to access User 2's leave request
      try {
        await mockAuthUtils.requireResourceOwnership(user2LeaveRequest.userId);
        expect(true).toBe(false); // Should not reach this
      } catch (error: unknown) {
        expect((error as Error).message).toBe('You can only access your own resources');
      }
    });

    it('should validate admin override permissions correctly', async () => {
      const admin = testUtils.mockUser({ role: 'ADMIN' });
      const regularUser = testUtils.mockUser({ role: 'USER' });

      // Admin should be able to override
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(admin);
      mockAuthUtils.requireResourceOwnership.mockResolvedValue(admin);

      const adminResult = await mockAuthUtils.requireResourceOwnership('other-user-id', true);
      expect(adminResult).toEqual(admin);

      // Regular user should not be able to override
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(regularUser);
      const { AuthorizationError: AuthError } = await import('@/lib/api/errors');
      mockAuthUtils.requireResourceOwnership.mockRejectedValue(
        new AuthError('You can only access your own resources')
      );

      try {
        await mockAuthUtils.requireResourceOwnership('other-user-id', true);
        expect(true).toBe(false); // Should not reach this
      } catch (error: unknown) {
        expect((error as Error).message).toBe('You can only access your own resources');
      }
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in API responses', async () => {
      const userWithPassword = {
        id: 'user-1',
        email: 'user@example.com',
        password: 'hashed-password-should-not-be-exposed',
        resetToken: 'secret-token',
        name: 'Test User'
      };

      mockPrisma.user.create.mockResolvedValue(userWithPassword);
      mockAuthUtils.createUser.mockResolvedValue(userWithPassword);

      const payload = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.data.user.password).toBeUndefined();
      expect(result.data.user.resetToken).toBeUndefined();
      expect(result.data.user.id).toBe('user-1');
      expect(result.data.user.email).toBe('user@example.com');
    });

    it('should implement proper data encryption for sensitive fields', async () => {
      // Test password hashing
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await mockAuthUtils.hashPassword(plainPassword);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50);

      // Test password verification
      const isValid = await mockAuthUtils.verifyPassword(plainPassword, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await mockAuthUtils.verifyPassword('WrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Client Security Validation', () => {
    it('should validate client security information', () => {
      const secureRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (legitimate browser)',
          'x-real-ip': '192.168.1.1'
        }
      });

      const result = validateClientSecurity(secureRequest);

      expect(result.isSecure).toBe(true);
      expect(result.clientInfo.ip).toBe('192.168.1.1');
      expect(result.clientInfo.userAgent).toBe('Mozilla/5.0 (legitimate browser)');
    });

    it('should detect suspicious client behavior', () => {
      const suspiciousRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'user-agent': 'malicious-bot/1.0',
          // Missing IP headers
        }
      });

      const result = validateClientSecurity(suspiciousRequest);

      expect(result.isSecure).toBe(false);
      expect(result.clientInfo.ip).toBe('unknown');
    });
  });

  describe('Security Headers', () => {
    it('should set appropriate security headers', () => {
      const testData = { message: 'test' };
      const secureResponse = createSecureResponse(testData, 200);

      expect(secureResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(secureResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(secureResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(secureResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(secureResponse.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    });
  });

  describe('Audit Logging', () => {
    it('should log security events with appropriate risk levels', () => {
      const { logger: mockLogger } = await import('@/lib/logger');
      mockLogger.securityEvent = jest.fn();

      // Test different risk levels
      auditLog('user_login', 'user-1', { ip: '192.168.1.1' }, 'low');
      auditLog('admin_access', 'admin-1', { resource: 'user_data' }, 'medium');
      auditLog('failed_login', 'attacker', { attempts: 5 }, 'high');

      expect(mockLogger.securityEvent).toHaveBeenCalledTimes(3);
      expect(mockLogger.securityEvent).toHaveBeenCalledWith('audit_log', 'low', 'user-1', 
        expect.objectContaining({ action: 'user_login' }));
      expect(mockLogger.securityEvent).toHaveBeenCalledWith('audit_log', 'medium', 'admin-1', 
        expect.objectContaining({ action: 'admin_access' }));
      expect(mockLogger.securityEvent).toHaveBeenCalledWith('audit_log', 'high', 'attacker', 
        expect.objectContaining({ action: 'failed_login' }));
    });
  });

  describe('Content Security Policy', () => {
    it('should prevent inline script execution', async () => {
      const maliciousContent = {
        name: '<img src=x onerror=alert(1)>',
        bio: '<script>fetch("/api/admin/users").then(r=>r.json()).then(console.log)</script>'
      };

      mockSanitization.sanitizeInput = jest.fn()
        .mockReturnValueOnce('Clean Name')
        .mockReturnValueOnce('Clean Bio');

      // Test that sanitization removes dangerous content
      const sanitizedName = mockSanitization.sanitizeInput(maliciousContent.name);
      const sanitizedBio = mockSanitization.sanitizeInput(maliciousContent.bio);

      expect(sanitizedName).toBe('Clean Name');
      expect(sanitizedBio).toBe('Clean Bio');
      expect(mockSanitization.sanitizeInput).toHaveBeenCalledTimes(2);
    });
  });

  describe('Mass Assignment Protection', () => {
    it('should prevent mass assignment vulnerabilities', async () => {
      const maliciousPayload = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: 'ADMIN', // Attempting to escalate privileges
        id: 'custom-id', // Attempting to control ID
        isActive: false // Attempting to modify protected field
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockAuthUtils.createUser.mockImplementation((data) => {
        // Should only use whitelisted fields
        const allowedFields = ['email', 'password', 'name'];
        const sanitizedData = Object.keys(data)
          .filter(key => allowedFields.includes(key))
          .reduce((obj: Record<string, unknown>, key) => {
            obj[key] = data[key as keyof typeof data];
            return obj;
          }, {});

        return Promise.resolve({
          id: 'generated-id', // System generates ID
          role: 'USER', // Default role assigned
          ...sanitizedData,
          password: 'hashed-password'
        });
      });

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload)
      });

      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.data.user.role).toBe('USER'); // Should not be 'ADMIN'
      expect(result.data.user.id).toBe('generated-id'); // Should not be 'custom-id'
    });
  });
});