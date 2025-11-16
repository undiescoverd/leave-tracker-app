// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/leave_tracker_test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.RESEND_API_KEY = 'test-key';

// Mock environment variables for features
process.env.TOIL_ENABLED = 'true';
process.env.SICK_LEAVE_ENABLED = 'true';