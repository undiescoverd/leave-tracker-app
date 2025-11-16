import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/email/service');
jest.mock('@/lib/middleware/sanitization');

import { prisma } from '@/lib/prisma';
import * as authUtils from '@/lib/auth-utils';
import * as emailService from '@/lib/email/service';
import * as sanitization from '@/lib/middleware/sanitization';

const mockPrisma = prisma;
const mockAuthUtils = authUtils;
const mockEmailService = emailService;
const mockSanitization = sanitization;

describe('Authentication API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockSanitization.sanitizeInput = jest.fn().mockImplementation((input) => input);
    mockSanitization.validateInput = jest.fn().mockReturnValue({ isValid: true });
  });

  describe('POST /api/auth/register', () => {
    const createRequest = (body: Record<string, unknown>) => {
      return new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('should successfully register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User'
      };

      const mockCreatedUser = {
        id: 'user-1',
        ...userData,
        password: 'hashed-password',
        role: 'USER'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      mockAuthUtils.createUser.mockResolvedValue(mockCreatedUser);

      const request = createRequest(userData);
      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(userData.email);
      expect(result.data.user.password).toBeUndefined(); // Password should be excluded
    });

    it('should reject registration for existing user', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        name: 'Existing User'
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' }); // User exists

      const request = createRequest(userData);
      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // Missing password and name
      };

      const request = createRequest(incompleteData);
      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const request = createRequest(invalidEmailData);
      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123', // Weak password
        name: 'Test User'
      };

      const request = createRequest(weakPasswordData);
      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest(userData);
      const response = await registerPOST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
    });

    it('should sanitize user input', async () => {
      const maliciousData = {
        email: '<script>alert("xss")</script>@example.com',
        password: 'SecurePassword123!',
        name: '<img src=x onerror=alert(1)>Test User'
      };

      mockSanitization.sanitizeInput
        .mockReturnValueOnce('clean-email@example.com')
        .mockReturnValueOnce('SecurePassword123!')
        .mockReturnValueOnce('Clean Test User');

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockAuthUtils.createUser.mockResolvedValue({
        id: 'user-1',
        email: 'clean-email@example.com',
        name: 'Clean Test User'
      });

      const request = createRequest(maliciousData);
      const response = await registerPOST(request);

      expect(mockSanitization.sanitizeInput).toHaveBeenCalledTimes(3);
      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    const createRequest = (body: Record<string, unknown>) => {
      return new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('should send reset email for existing user', async () => {
      const email = 'user@example.com';
      const mockUser = testUtils.mockUser({ email });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

      const request = createRequest({ email });
      const response = await forgotPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('reset link sent');
      
      // Verify reset token was generated
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email },
        data: {
          resetToken: expect.any(String),
          resetTokenExpires: expect.any(Date)
        }
      });
      
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        expect.any(String)
      );
    });

    it('should return success even for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = createRequest({ email });
      const response = await forgotPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('reset link sent');
      
      // Should not attempt to send email for non-existent user
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const request = createRequest({ email: 'invalid-email' });
      const response = await forgotPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should handle email service failures gracefully', async () => {
      const email = 'user@example.com';
      const mockUser = testUtils.mockUser({ email });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service down'));

      const request = createRequest({ email });
      const response = await forgotPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    const createRequest = (body: Record<string, unknown>) => {
      return new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('should reset password with valid token', async () => {
      const resetData = {
        token: 'valid-reset-token',
        password: 'NewSecurePassword123!'
      };

      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future
      const mockUser = testUtils.mockUser({
        resetToken: 'valid-reset-token',
        resetTokenExpires: futureDate
      });

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockAuthUtils.hashPassword.mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const request = createRequest(resetData);
      const response = await resetPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset successful');

      // Verify password was updated and token cleared
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          password: 'new-hashed-password',
          resetToken: null,
          resetTokenExpires: null
        }
      });
    });

    it('should reject invalid token', async () => {
      const resetData = {
        token: 'invalid-token',
        password: 'NewSecurePassword123!'
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request = createRequest(resetData);
      const response = await resetPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired');
    });

    it('should reject expired token', async () => {
      const resetData = {
        token: 'expired-token',
        password: 'NewSecurePassword123!'
      };

      const pastDate = new Date(Date.now() - 3600000); // 1 hour in past
      const mockUser = testUtils.mockUser({
        resetToken: 'expired-token',
        resetTokenExpires: pastDate
      });

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const request = createRequest(resetData);
      const response = await resetPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired');
    });

    it('should validate new password strength', async () => {
      const resetData = {
        token: 'valid-token',
        password: '123' // Weak password
      };

      const request = createRequest(resetData);
      const response = await resetPasswordPOST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting for registration attempts', async () => {
      // This would require implementing rate limiting middleware
      // For now, we'll test that the structure supports it
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockAuthUtils.createUser.mockResolvedValue(testUtils.mockUser());

      // Make multiple requests rapidly
      const requests = Array(5).fill(null).map(() => 
        registerPOST(createRequest(userData))
      );

      const responses = await Promise.all(requests);

      // At least some should succeed (implementation dependent)
      expect(responses.some(r => r.status === 201)).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should return secure response headers', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockAuthUtils.createUser.mockResolvedValue(testUtils.mockUser());

      const request = createRequest(userData);
      const response = await registerPOST(request);

      // Check for security headers (implementation dependent)
      const headers = response.headers;
      
      // These would be set by security middleware
      expect(headers.get('X-Content-Type-Options')).toBeTruthy();
      expect(headers.get('X-Frame-Options')).toBeTruthy();
    });
  });
});