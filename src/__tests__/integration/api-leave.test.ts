import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getLeaveRequests } from '@/app/api/leave/requests/route';
import { GET as getLeaveBalance } from '@/app/api/leave/balance/route';
import { POST as createLeaveRequest } from '@/app/api/leave/request/route';
import { PATCH as approveRequest } from '@/app/api/leave/request/[id]/approve/route';
import { PATCH as rejectRequest } from '@/app/api/leave/request/[id]/reject/route';

// Mock dependencies
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/services/leave.service');
jest.mock('@/lib/services/leave-balance.service');
jest.mock('@/lib/middleware/sanitization');

import * as mockAuthUtils from '@/lib/auth-utils';
import * as mockLeaveService from '@/lib/services/leave.service';
import * as mockLeaveBalanceService from '@/lib/services/leave-balance.service';
import * as mockSanitization from '@/lib/middleware/sanitization';
import '../setup';

describe('Leave API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockSanitization.sanitizeInput = jest.fn().mockImplementation(input => input);
    mockSanitization.validateInput = jest.fn().mockReturnValue({ isValid: true });
  });

  describe('GET /api/leave/requests', () => {
    const createRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/leave/requests');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value as string);
      });
      
      return new NextRequest(url.toString(), { method: 'GET' });
    };

    it('should return user leave requests with pagination', async () => {
      const mockUser = testUtils.mockUser();
      const mockRequests = [
        testUtils.mockLeaveRequest(),
        testUtils.mockLeaveRequest({ id: 'req-2', status: 'APPROVED' })
      ];

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveService.getUserLeaveRequests = jest.fn().mockResolvedValue({
        requests: mockRequests,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      const request = createRequest({ page: '1', limit: '10' });
      const response = await getLeaveRequests(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.requests).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.page).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const mockUser = testUtils.mockUser();
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveService.getUserLeaveRequests = jest.fn().mockResolvedValue({
        requests: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });

      const request = createRequest({ status: 'APPROVED' });
      await getLeaveRequests(request);

      expect(mockLeaveService.getUserLeaveRequests).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ status: 'APPROVED' })
      );
    });

    it('should require authentication', async () => {
      const { AuthenticationError } = await import('@/lib/api/errors');
      mockAuthUtils.getAuthenticatedUser.mockRejectedValue(
        new AuthenticationError('Not authenticated')
      );

      const request = createRequest();
      const response = await getLeaveRequests(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = testUtils.mockUser();
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveService.getUserLeaveRequests = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest();
      const response = await getLeaveRequests(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
    });

    it('should validate pagination parameters', async () => {
      const mockUser = testUtils.mockUser();
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);

      // Test with invalid page number
      const request = createRequest({ page: '-1' });
      const response = await getLeaveRequests(request);

      // Should default to valid values
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/leave/balance', () => {
    const createRequest = () => {
      return new NextRequest('http://localhost:3000/api/leave/balance', {
        method: 'GET'
      });
    };

    it('should return user leave balance', async () => {
      const mockUser = testUtils.mockUser();
      const mockBalance = {
        annual: { total: 32, used: 5, remaining: 27 },
        toil: { total: 8, used: 2, remaining: 6 },
        sick: { total: 3, used: 0, remaining: 3 }
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveBalanceService.getUserLeaveBalances.mockResolvedValue(mockBalance);

      const request = createRequest();
      const response = await getLeaveBalance(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBalance);
    });

    it('should require authentication', async () => {
      const { AuthenticationError } = await import('@/lib/api/errors');
      mockAuthUtils.getAuthenticatedUser.mockRejectedValue(
        new AuthenticationError('Not authenticated')
      );

      const request = createRequest();
      const response = await getLeaveBalance(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
    });
  });

  describe('POST /api/leave/request', () => {
    const createRequest = (body: Record<string, unknown>) => {
      return new NextRequest('http://localhost:3000/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('should create leave request successfully', async () => {
      const mockUser = testUtils.mockUser();
      const requestData = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: 'ANNUAL',
        reason: 'Summer vacation'
      };

      const mockCreatedRequest = testUtils.mockLeaveRequest({
        ...requestData,
        startDate: new Date(requestData.startDate),
        endDate: new Date(requestData.endDate),
        userId: mockUser.id
      });

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveBalanceService.validateLeaveRequest.mockResolvedValue({ valid: true });
      mockLeaveService.createLeaveRequest = jest.fn().mockResolvedValue(mockCreatedRequest);

      const request = createRequest(requestData);
      const response = await createLeaveRequest(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockCreatedRequest.id);
    });

    it('should validate leave request before creation', async () => {
      const mockUser = testUtils.mockUser();
      const requestData = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: 'ANNUAL',
        reason: 'Vacation'
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveBalanceService.validateLeaveRequest.mockResolvedValue({
        valid: false,
        error: 'Insufficient leave balance'
      });

      const request = createRequest(requestData);
      const response = await createLeaveRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient leave balance');
    });

    it('should check for UK agent conflicts', async () => {
      const mockUser = testUtils.mockUser({ email: 'uk.agent@company.com' });
      const requestData = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: 'ANNUAL',
        reason: 'Vacation'
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveBalanceService.validateLeaveRequest.mockResolvedValue({ valid: true });
      mockLeaveService.checkUKAgentConflict.mockResolvedValue({
        hasConflict: true,
        conflictingAgents: ['Another UK Agent']
      });

      const request = createRequest(requestData);
      const response = await createLeaveRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('UK agent conflict');
    });

    it('should validate required fields', async () => {
      const mockUser = testUtils.mockUser();
      const incompleteData = {
        startDate: '2024-06-01',
        // Missing endDate, type, reason
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = createRequest(incompleteData);
      const response = await createLeaveRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should sanitize input data', async () => {
      const mockUser = testUtils.mockUser();
      const maliciousData = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: 'ANNUAL',
        reason: '<script>alert("xss")</script>Vacation'
      };

      mockSanitization.sanitizeInput.mockReturnValue('Clean Vacation');
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveBalanceService.validateLeaveRequest.mockResolvedValue({ valid: true });
      mockLeaveService.createLeaveRequest = jest.fn().mockResolvedValue(testUtils.mockLeaveRequest());

      const request = createRequest(maliciousData);
      const response = await createLeaveRequest(request);

      expect(mockSanitization.sanitizeInput).toHaveBeenCalledWith(maliciousData.reason);
      expect(response.status).toBe(201);
    });
  });

  describe('PATCH /api/leave/request/[id]/approve', () => {
    const createRequest = (id: string, body: Record<string, unknown> = {}) => {
      return new NextRequest(`http://localhost:3000/api/leave/request/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('should approve leave request as admin', async () => {
      const mockAdmin = testUtils.mockUser({ role: 'ADMIN' });
      const requestId = 'req-1';
      const mockRequest = testUtils.mockLeaveRequest({ id: requestId });

      mockAuthUtils.requireAdmin.mockResolvedValue(mockAdmin);
      mockLeaveService.approveLeaveRequest = jest.fn().mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED'
      });

      const request = createRequest(requestId, { comments: 'Approved for vacation' });
      const response = await approveRequest(request, { params: { id: requestId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('APPROVED');
    });

    it('should require admin role', async () => {
      const requestId = 'req-1';
      
      const { AuthorizationError } = await import('@/lib/api/errors');
      mockAuthUtils.requireAdmin.mockRejectedValue(
        new AuthorizationError('Admin required')
      );

      const request = createRequest(requestId);
      const response = await approveRequest(request, { params: { id: requestId } });
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
    });

    it('should handle non-existent request', async () => {
      const mockAdmin = testUtils.mockUser({ role: 'ADMIN' });
      const requestId = 'non-existent';

      mockAuthUtils.requireAdmin.mockResolvedValue(mockAdmin);
      mockLeaveService.approveLeaveRequest = jest.fn().mockRejectedValue(
        new Error('Leave request not found')
      );

      const request = createRequest(requestId);
      const response = await approveRequest(request, { params: { id: requestId } });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
    });
  });

  describe('PATCH /api/leave/request/[id]/reject', () => {
    const createRequest = (id: string, body: Record<string, unknown> = {}) => {
      return new NextRequest(`http://localhost:3000/api/leave/request/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    };

    it('should reject leave request as admin', async () => {
      const mockAdmin = testUtils.mockUser({ role: 'ADMIN' });
      const requestId = 'req-1';
      const mockRequest = testUtils.mockLeaveRequest({ id: requestId });

      mockAuthUtils.requireAdmin.mockResolvedValue(mockAdmin);
      mockLeaveService.rejectLeaveRequest = jest.fn().mockResolvedValue({
        ...mockRequest,
        status: 'REJECTED'
      });

      const request = createRequest(requestId, { 
        reason: 'Insufficient coverage during requested dates' 
      });
      const response = await rejectRequest(request, { params: { id: requestId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('REJECTED');
    });

    it('should require rejection reason for transparency', async () => {
      const mockAdmin = testUtils.mockUser({ role: 'ADMIN' });
      const requestId = 'req-1';

      mockAuthUtils.requireAdmin.mockResolvedValue(mockAdmin);

      const request = createRequest(requestId); // No reason provided
      const response = await rejectRequest(request, { params: { id: requestId } });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('reason');
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle concurrent requests safely', async () => {
      const mockUser = testUtils.mockUser();
      const requestData = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: 'ANNUAL',
        reason: 'Vacation'
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);
      mockLeaveBalanceService.validateLeaveRequest.mockResolvedValue({ valid: true });
      mockLeaveService.createLeaveRequest = jest.fn().mockResolvedValue(testUtils.mockLeaveRequest());

      // Make multiple concurrent requests
      const requests = Array(3).fill(null).map(() => 
        createLeaveRequest(new NextRequest('http://localhost:3000/api/leave/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        }))
      );

      const responses = await Promise.all(requests);

      // All should succeed independently (optimistic concurrency)
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('should validate date ranges', async () => {
      const mockUser = testUtils.mockUser();
      const invalidData = {
        startDate: '2024-06-05',
        endDate: '2024-06-01', // End before start
        type: 'ANNUAL',
        reason: 'Vacation'
      };

      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      const response = await createLeaveRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });

      const response = await createLeaveRequest(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should prevent SQL injection attempts', async () => {
      const mockUser = testUtils.mockUser();
      const maliciousData = {
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        type: "ANNUAL'; DROP TABLE users; --",
        reason: 'Vacation'
      };

      mockSanitization.sanitizeInput.mockImplementation(input => 
        typeof input === 'string' ? input.replace(/[;'"]/g, '') : input
      );
      
      mockAuthUtils.getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      await createLeaveRequest(request);

      // Should sanitize the input
      expect(mockSanitization.sanitizeInput).toHaveBeenCalledWith(maliciousData.type);
    });
  });
});