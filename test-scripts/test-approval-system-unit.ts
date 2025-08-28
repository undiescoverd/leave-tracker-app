import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';

// Mock response functions
const mockApiSuccess = jest.fn().mockImplementation((data) => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

const mockApiError = jest.fn().mockImplementation((error, status) => {
  return new Response(JSON.stringify(error), {
    status: status || 500,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Mock session
const mockSession = {
  user: {
    id: 'admin-id',
    role: 'ADMIN'
  }
};

// Mock leave request
const mockLeaveRequest = {
  id: 'test-id',
  status: 'PENDING',
  user: {
    id: 'user-id',
    email: 'user@example.com'
  }
};

// Mock functions
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(mockSession)
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    leaveRequest: {
      findUnique: jest.fn().mockResolvedValue(mockLeaveRequest),
      update: jest.fn().mockResolvedValue({
        ...mockLeaveRequest,
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy: 'admin-id'
      })
    }
  }
}));

jest.mock('@/lib/api/response', () => ({
  apiSuccess: jest.fn().mockImplementation(mockApiSuccess),
  apiError: jest.fn().mockImplementation(mockApiError)
}));

describe('Leave Request Approval System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Approve Handler', () => {
    it('should approve a pending leave request', async () => {
      const { POST: approveHandler } = await import('../src/app/api/leave/request/[id]/approve/route');
      
      const request = new NextRequest('http://localhost:3000/api/leave/request/test-id/approve', {
        method: 'POST'
      });

      const context = {
        params: Promise.resolve({ id: 'test-id' })
      };

      const response = await approveHandler(request, context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe('Leave request approved successfully');
    });
  });

  describe('Reject Handler', () => {
    it('should reject a pending leave request with reason', async () => {
      const { POST: rejectHandler } = await import('../src/app/api/leave/request/[id]/reject/route');
      
      const request = new NextRequest('http://localhost:3000/api/leave/request/test-id/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test rejection reason' })
      });

      const context = {
        params: Promise.resolve({ id: 'test-id' })
      };

      const response = await rejectHandler(request, context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe('Leave request rejected successfully');
    });

    it('should require a rejection reason', async () => {
      const { POST: rejectHandler } = await import('../src/app/api/leave/request/[id]/reject/route');
      
      const request = new NextRequest('http://localhost:3000/api/leave/request/test-id/reject', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const context = {
        params: Promise.resolve({ id: 'test-id' })
      };

      const response = await rejectHandler(request, context);
      expect(response.status).toBe(400);
    });
  });
});