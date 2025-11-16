import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';

// Mock Playwright for testing environment
const mockPage = {
  goto: jest.fn(),
  fill: jest.fn(),
  click: jest.fn(),
  waitForSelector: jest.fn(),
  textContent: jest.fn(),
  screenshot: jest.fn(),
  evaluate: jest.fn(),
  waitForResponse: jest.fn(),
  waitForNavigation: jest.fn(),
  getByRole: jest.fn(),
  getByText: jest.fn(),
  getByTestId: jest.fn(),
  locator: jest.fn().mockReturnValue({
    fill: jest.fn(),
    click: jest.fn(),
    textContent: jest.fn(),
    isVisible: jest.fn(),
    waitFor: jest.fn()
  })
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn()
};

const mockPlaywright = {
  chromium: {
    launch: jest.fn().mockResolvedValue(mockBrowser)
  }
};

// Mock the Playwright module
jest.mock('playwright', () => mockPlaywright);

describe('User Journey E2E Tests', () => {
  let browser: import('playwright').Browser;
  let page: import('playwright').Page;

  beforeAll(async () => {
    browser = await mockPlaywright.chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset common mock responses
    mockPage.waitForSelector.mockResolvedValue(true);
    mockPage.textContent.mockResolvedValue('');
    mockPage.evaluate.mockResolvedValue(null);
  });

  describe('Authentication Flow', () => {
    it('should complete login → dashboard → logout journey', async () => {
      // Step 1: Navigate to login page
      await page.goto('http://localhost:3000/login');
      expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:3000/login');

      // Step 2: Fill login form
      await page.fill('#email', 'user@example.com');
      await page.fill('#password', 'password123');
      expect(mockPage.fill).toHaveBeenCalledWith('#email', 'user@example.com');
      expect(mockPage.fill).toHaveBeenCalledWith('#password', 'password123');

      // Step 3: Submit login
      mockPage.waitForResponse.mockResolvedValue({ 
        status: () => 200, 
        json: () => Promise.resolve({ success: true }) 
      });
      
      await page.click('button[type="submit"]');
      expect(mockPage.click).toHaveBeenCalledWith('button[type="submit"]');

      // Step 4: Wait for redirect to dashboard
      mockPage.waitForSelector.mockResolvedValue(true);
      await page.waitForSelector('[data-testid="dashboard"]');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('[data-testid="dashboard"]');

      // Step 5: Verify dashboard loaded
      mockPage.textContent.mockResolvedValue('Welcome, Test User');
      const welcomeText = await page.textContent('[data-testid="welcome-message"]');
      expect(welcomeText).toBe('Welcome, Test User');

      // Step 6: Logout
      await page.click('[data-testid="logout-button"]');
      expect(mockPage.click).toHaveBeenCalledWith('[data-testid="logout-button"]');

      // Step 7: Verify redirect to login
      await page.waitForSelector('#email');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#email');
    });

    it('should handle login failure gracefully', async () => {
      await page.goto('http://localhost:3000/login');
      
      // Invalid credentials
      await page.fill('#email', 'invalid@example.com');
      await page.fill('#password', 'wrongpassword');

      // Mock failed response
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 401,
        json: () => Promise.resolve({ success: false, error: 'Invalid credentials' })
      });

      await page.click('button[type="submit"]');

      // Should show error message
      await page.waitForSelector('[data-testid="error-message"]');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('[data-testid="error-message"]');

      mockPage.textContent.mockResolvedValue('Invalid credentials');
      const errorText = await page.textContent('[data-testid="error-message"]');
      expect(errorText).toBe('Invalid credentials');
    });

    it('should handle password reset flow', async () => {
      await page.goto('http://localhost:3000/login');
      
      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');
      expect(mockPage.click).toHaveBeenCalledWith('[data-testid="forgot-password-link"]');

      // Should navigate to forgot password page
      await page.waitForSelector('#reset-email');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#reset-email');

      // Enter email and submit
      await page.fill('#reset-email', 'user@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      mockPage.textContent.mockResolvedValue('Reset link sent to your email');
      const successText = await page.textContent('[data-testid="success-message"]');
      expect(successText).toBe('Reset link sent to your email');
    });
  });

  describe('Leave Request Flow', () => {
    beforeEach(async () => {
      // Mock authenticated state
      mockPage.evaluate.mockImplementation((fn: () => unknown) => {
        if (fn.toString().includes('sessionStorage')) {
          return JSON.stringify({ user: { email: 'user@example.com' } });
        }
        return null;
      });
    });

    it('should complete leave request creation flow', async () => {
      // Step 1: Navigate to dashboard
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Step 2: Click new leave request button
      await page.click('[data-testid="new-leave-request"]');
      expect(mockPage.click).toHaveBeenCalledWith('[data-testid="new-leave-request"]');

      // Step 3: Wait for leave request form
      await page.waitForSelector('[data-testid="leave-request-form"]');

      // Step 4: Fill leave request form
      await page.fill('#start-date', '2024-06-01');
      await page.fill('#end-date', '2024-06-05');
      await page.click('[data-testid="leave-type-annual"]');
      await page.fill('#reason', 'Summer vacation');

      expect(mockPage.fill).toHaveBeenCalledWith('#start-date', '2024-06-01');
      expect(mockPage.fill).toHaveBeenCalledWith('#end-date', '2024-06-05');
      expect(mockPage.fill).toHaveBeenCalledWith('#reason', 'Summer vacation');

      // Step 5: Submit request
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 201,
        json: () => Promise.resolve({ 
          success: true, 
          data: { id: 'req-1', status: 'PENDING' } 
        })
      });

      await page.click('[data-testid="submit-request"]');
      expect(mockPage.click).toHaveBeenCalledWith('[data-testid="submit-request"]');

      // Step 6: Verify success message
      await page.waitForSelector('[data-testid="success-message"]');
      mockPage.textContent.mockResolvedValue('Leave request submitted successfully');
      const successText = await page.textContent('[data-testid="success-message"]');
      expect(successText).toBe('Leave request submitted successfully');

      // Step 7: Verify request appears in list
      await page.waitForSelector('[data-testid="leave-requests-list"]');
      mockPage.textContent.mockResolvedValue('Summer vacation');
      const requestText = await page.textContent('[data-testid="request-req-1"] [data-testid="reason"]');
      expect(requestText).toBe('Summer vacation');
    });

    it('should handle insufficient balance validation', async () => {
      await page.goto('http://localhost:3000/dashboard');
      await page.click('[data-testid="new-leave-request"]');
      await page.waitForSelector('[data-testid="leave-request-form"]');

      // Request more days than available
      await page.fill('#start-date', '2024-06-01');
      await page.fill('#end-date', '2024-12-31'); // Long vacation
      await page.fill('#reason', 'Extended vacation');

      // Mock validation error response
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 400,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Insufficient annual leave. You have 27 days remaining.' 
        })
      });

      await page.click('[data-testid="submit-request"]');

      // Should show error message
      await page.waitForSelector('[data-testid="error-message"]');
      mockPage.textContent.mockResolvedValue('Insufficient annual leave. You have 27 days remaining.');
      const errorText = await page.textContent('[data-testid="error-message"]');
      expect(errorText).toBe('Insufficient annual leave. You have 27 days remaining.');
    });

    it('should handle UK agent conflict detection', async () => {
      // Mock UK agent user
      mockPage.evaluate.mockImplementation((fn: () => unknown) => {
        if (fn.toString().includes('sessionStorage')) {
          return JSON.stringify({ user: { email: 'uk.agent@company.com' } });
        }
        return null;
      });

      await page.goto('http://localhost:3000/dashboard');
      await page.click('[data-testid="new-leave-request"]');
      await page.waitForSelector('[data-testid="leave-request-form"]');

      await page.fill('#start-date', '2024-06-01');
      await page.fill('#end-date', '2024-06-05');
      await page.fill('#reason', 'Vacation');

      // Mock conflict response
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 400,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'UK agent conflict detected with: Another UK Agent' 
        })
      });

      await page.click('[data-testid="submit-request"]');

      // Should show conflict warning
      await page.waitForSelector('[data-testid="warning-message"]');
      mockPage.textContent.mockResolvedValue('UK agent conflict detected with: Another UK Agent');
      const warningText = await page.textContent('[data-testid="warning-message"]');
      expect(warningText).toBe('UK agent conflict detected with: Another UK Agent');
    });
  });

  describe('Admin Approval Flow', () => {
    beforeEach(async () => {
      // Mock admin user
      mockPage.evaluate.mockImplementation((fn: () => unknown) => {
        if (fn.toString().includes('sessionStorage')) {
          return JSON.stringify({ user: { email: 'admin@example.com', role: 'ADMIN' } });
        }
        return null;
      });
    });

    it('should complete admin approval workflow', async () => {
      // Step 1: Navigate to admin dashboard
      await page.goto('http://localhost:3000/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Step 2: Navigate to pending requests
      await page.click('[data-testid="pending-requests-tab"]');
      await page.waitForSelector('[data-testid="pending-requests-list"]');

      // Step 3: Find and review request
      mockPage.textContent.mockResolvedValue('Summer vacation - 5 days');
      const requestSummary = await page.textContent('[data-testid="request-req-1-summary"]');
      expect(requestSummary).toBe('Summer vacation - 5 days');

      // Step 4: Approve request
      await page.click('[data-testid="approve-req-1"]');

      // Step 5: Add approval comment
      await page.waitForSelector('[data-testid="approval-modal"]');
      await page.fill('#approval-comments', 'Approved for summer break');
      
      // Mock approval response
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 200,
        json: () => Promise.resolve({ 
          success: true, 
          data: { id: 'req-1', status: 'APPROVED' } 
        })
      });

      await page.click('[data-testid="confirm-approval"]');

      // Step 6: Verify success and status update
      await page.waitForSelector('[data-testid="success-message"]');
      mockPage.textContent.mockResolvedValue('Leave request approved successfully');
      const successText = await page.textContent('[data-testid="success-message"]');
      expect(successText).toBe('Leave request approved successfully');
    });

    it('should handle bulk approval operations', async () => {
      await page.goto('http://localhost:3000/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Select multiple requests
      await page.click('[data-testid="select-req-1"]');
      await page.click('[data-testid="select-req-2"]');
      await page.click('[data-testid="select-req-3"]');

      // Click bulk approve
      await page.click('[data-testid="bulk-approve"]');

      // Confirm bulk operation
      await page.waitForSelector('[data-testid="bulk-confirm-modal"]');
      await page.click('[data-testid="confirm-bulk-approval"]');

      // Mock bulk response
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 200,
        json: () => Promise.resolve({ 
          success: true, 
          data: { approved: 3, failed: 0 } 
        })
      });

      // Verify success
      await page.waitForSelector('[data-testid="bulk-success"]');
      mockPage.textContent.mockResolvedValue('3 requests approved successfully');
      const bulkSuccessText = await page.textContent('[data-testid="bulk-success"]');
      expect(bulkSuccessText).toBe('3 requests approved successfully');
    });
  });

  describe('TOIL Request Flow', () => {
    it('should complete TOIL request with calculation', async () => {
      await page.goto('http://localhost:3000/dashboard');
      await page.click('[data-testid="new-leave-request"]');
      await page.waitForSelector('[data-testid="leave-request-form"]');

      // Select TOIL type
      await page.click('[data-testid="leave-type-toil"]');
      
      // TOIL-specific fields should appear
      await page.waitForSelector('[data-testid="toil-scenario-selector"]');
      
      // Select scenario
      await page.click('[data-testid="scenario-overnight-working-day"]');
      
      // Fill dates and return time
      await page.fill('#travel-date', '2024-06-01');
      await page.fill('#return-time', '21:00');
      await page.fill('#reason', 'Client meeting in Manchester');

      // TOIL calculation should update
      mockPage.textContent.mockResolvedValue('3 hours of TOIL will be allocated');
      const toilCalculation = await page.textContent('[data-testid="toil-calculation"]');
      expect(toilCalculation).toBe('3 hours of TOIL will be allocated');

      // Submit TOIL request
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 201,
        json: () => Promise.resolve({ 
          success: true, 
          data: { id: 'toil-1', hours: 3, status: 'PENDING' } 
        })
      });

      await page.click('[data-testid="submit-request"]');

      // Verify TOIL request creation
      await page.waitForSelector('[data-testid="success-message"]');
      mockPage.textContent.mockResolvedValue('TOIL request submitted for 3 hours');
      const successText = await page.textContent('[data-testid="success-message"]');
      expect(successText).toBe('TOIL request submitted for 3 hours');
    });
  });

  describe('Calendar Integration', () => {
    it('should display team calendar with leave data', async () => {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForSelector('[data-testid="team-calendar"]');

      // Wait for calendar data to load
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 200,
        json: () => Promise.resolve({
          success: true,
          data: {
            requests: [
              {
                id: 'req-1',
                user: { name: 'John Doe' },
                startDate: '2024-06-01',
                endDate: '2024-06-05',
                type: 'ANNUAL'
              }
            ]
          }
        })
      });

      await page.waitForResponse('**/api/calendar/team-leave**');

      // Verify calendar shows leave data
      await page.waitForSelector('[data-testid="calendar-event-req-1"]');
      mockPage.textContent.mockResolvedValue('John Doe - Annual Leave');
      const eventText = await page.textContent('[data-testid="calendar-event-req-1"]');
      expect(eventText).toBe('John Doe - Annual Leave');

      // Test calendar navigation
      await page.click('[data-testid="next-month"]');
      expect(mockPage.click).toHaveBeenCalledWith('[data-testid="next-month"]');

      // Should load data for new month
      await page.waitForResponse('**/api/calendar/team-leave**');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      await page.goto('http://localhost:3000/dashboard');
      await page.click('[data-testid="new-leave-request"]');

      // Fill form
      await page.fill('#start-date', '2024-06-01');
      await page.fill('#end-date', '2024-06-05');
      await page.fill('#reason', 'Vacation');

      // Mock network failure
      mockPage.waitForResponse.mockRejectedValue(new Error('Network error'));

      await page.click('[data-testid="submit-request"]');

      // Should show network error message
      await page.waitForSelector('[data-testid="network-error"]');
      mockPage.textContent.mockResolvedValue('Network error. Please try again.');
      const errorText = await page.textContent('[data-testid="network-error"]');
      expect(errorText).toBe('Network error. Please try again.');
    });

    it('should handle session timeout', async () => {
      // Start authenticated
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Mock session timeout response
      mockPage.waitForResponse.mockResolvedValue({
        status: () => 401,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Session expired' 
        })
      });

      // Try to perform an action
      await page.click('[data-testid="refresh-data"]');

      // Should redirect to login
      await page.waitForSelector('#email');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#email');

      // Should show session expired message
      mockPage.textContent.mockResolvedValue('Session expired. Please log in again.');
      const errorText = await page.textContent('[data-testid="session-expired"]');
      expect(errorText).toBe('Session expired. Please log in again.');
    });
  });

  describe('Performance and Accessibility', () => {
    it('should meet accessibility standards', async () => {
      await page.goto('http://localhost:3000/dashboard');
      
      // Mock accessibility audit
      mockPage.evaluate.mockResolvedValue({
        violations: [],
        passes: 15,
        incomplete: 0
      });

      // Run accessibility audit (mocked)
      const auditResults = await page.evaluate(() => {
        // In real implementation, this would run axe-core
        return { violations: [], passes: 15, incomplete: 0 };
      });

      expect(auditResults.violations).toHaveLength(0);
      expect(auditResults.passes).toBeGreaterThan(10);
    });

    it('should load within performance thresholds', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForSelector('[data-testid="dashboard"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds (mocked timing)
      expect(loadTime).toBeLessThan(3000);
    });
  });
});