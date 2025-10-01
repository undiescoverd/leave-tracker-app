#!/usr/bin/env tsx
/**
 * Security Testing Script
 * Tests security implementations across API endpoints
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface SecurityTest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedSecurityHeaders: string[];
}

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Test suite for security validation
const securityTests: SecurityTest[] = [
  // Authentication tests
  {
    name: 'Admin route without authentication',
    endpoint: '/api/admin/stats',
    method: 'GET',
    expectedStatus: 401,
    expectedSecurityHeaders: ['X-Content-Type-Options', 'X-Frame-Options']
  },
  {
    name: 'Admin route with invalid session',
    endpoint: '/api/admin/upcoming-leave',
    method: 'GET',
    headers: { 'Cookie': 'authjs.session-token=invalid' },
    expectedStatus: 401,
    expectedSecurityHeaders: ['X-Content-Type-Options']
  },

  // Rate limiting tests
  {
    name: 'Registration rate limiting',
    endpoint: '/api/auth/register',
    method: 'POST',
    body: {
      email: 'test@example.com',
      password: 'TestPassword123',
      name: 'Test User',
      confirmPassword: 'TestPassword123'
    },
    expectedStatus: 422, // Should fail validation or rate limit
    expectedSecurityHeaders: ['X-Content-Type-Options']
  },

  // Input validation tests
  {
    name: 'Leave request with invalid data',
    endpoint: '/api/leave/request',
    method: 'POST',
    body: {
      startDate: 'invalid-date',
      endDate: '2025-01-01',
      reason: '', // Empty reason should fail
      type: 'INVALID_TYPE'
    },
    expectedStatus: 422,
    expectedSecurityHeaders: ['X-Content-Type-Options']
  },

  // CSRF protection tests
  {
    name: 'POST without proper origin header',
    endpoint: '/api/leave/request',
    method: 'POST',
    headers: {
      'Origin': 'https://malicious-site.com',
      'Content-Type': 'application/json'
    },
    body: {
      startDate: '2025-09-15T00:00:00Z',
      endDate: '2025-09-16T00:00:00Z',
      reason: 'Test request',
      type: 'ANNUAL'
    },
    expectedStatus: 403, // CSRF protection should block
    expectedSecurityHeaders: ['X-Content-Type-Options']
  },

  // Security headers test
  {
    name: 'Security headers presence',
    endpoint: '/api/health',
    method: 'GET',
    expectedStatus: 200,
    expectedSecurityHeaders: [
      'X-Content-Type-Options',
      'X-Frame-Options', 
      'X-XSS-Protection',
      'Referrer-Policy'
    ]
  }
];

async function makeRequest(test: SecurityTest): Promise<{
  status: number;
  headers: Record<string, string>;
  body: any;
}> {
  try {
    const response = await fetch(`${BASE_URL}${test.endpoint}`, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...test.headers
      },
      body: test.body ? JSON.stringify(test.body) : undefined
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      status: response.status,
      headers,
      body
    };
  } catch (error) {
    throw new Error(`Request failed: ${error}`);
  }
}

function validateSecurityHeaders(headers: Record<string, string>, expected: string[]): {
  passed: boolean;
  missing: string[];
} {
  const missing = expected.filter(header => !headers[header.toLowerCase()]);
  return {
    passed: missing.length === 0,
    missing
  };
}

async function runSecurityTests(): Promise<void> {
  console.log('🔒 Starting Security Tests...\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of securityTests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const result = await makeRequest(test);
      
      // Check status code
      const statusMatch = result.status === test.expectedStatus;
      
      // Check security headers
      const headerValidation = validateSecurityHeaders(result.headers, test.expectedSecurityHeaders);
      
      if (statusMatch && headerValidation.passed) {
        console.log(`   ✅ PASSED - Status: ${result.status}`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`      Expected status: ${test.expectedStatus}, Got: ${result.status}`);
        if (!headerValidation.passed) {
          console.log(`      Missing headers: ${headerValidation.missing.join(', ')}`);
        }
        console.log(`      Response: ${JSON.stringify(result.body, null, 2)}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error}`);
      failed++;
    }
    
    console.log();
  }

  // Summary
  console.log('📊 SECURITY TEST SUMMARY');
  console.log('═'.repeat(40));
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 All security tests passed!');
  } else {
    console.log('⚠️ Some security tests failed. Review the issues above.');
    
    if (failed > passed) {
      console.log('🚨 CRITICAL: More tests failed than passed. Security implementation needs attention.');
    }
  }
}

// File-based security checks
function performStaticSecurityAnalysis(): void {
  console.log('🔍 Performing Static Security Analysis...\n');

  const criticalPatterns = [
    {
      name: 'SQL Injection Risk',
      pattern: /prisma.*\.raw\(/g,
      severity: 'CRITICAL'
    },
    {
      name: 'XSS Risk',
      pattern: /dangerouslySetInnerHTML|innerHTML\s*=/g,
      severity: 'HIGH'
    },
    {
      name: 'Hardcoded Secrets',
      pattern: /(password|secret|key)\s*[:=]\s*['"][^'"]{8,}/gi,
      severity: 'CRITICAL'
    },
    {
      name: 'Eval Usage',
      pattern: /eval\s*\(/g,
      severity: 'CRITICAL'
    }
  ];

  const apiFiles = [
    'src/app/api/admin/stats/route.ts',
    'src/app/api/admin/upcoming-leave/route.ts',
    'src/app/api/leave/request/route.ts',
    'src/app/api/auth/register/route.ts'
  ];

  let issuesFound = 0;

  for (const file of apiFiles) {
    try {
      const content = readFileSync(join(process.cwd(), file), 'utf8');
      
      for (const pattern of criticalPatterns) {
        const matches = content.match(pattern.pattern);
        if (matches) {
          console.log(`⚠️ ${pattern.severity}: ${pattern.name} in ${file}`);
          console.log(`   Matches: ${matches.length}`);
          issuesFound++;
        }
      }
      
    } catch (error) {
      console.log(`❌ Could not analyze ${file}: ${error}`);
    }
  }

  if (issuesFound === 0) {
    console.log('✅ No critical security patterns found in static analysis\n');
  } else {
    console.log(`\n🚨 Found ${issuesFound} potential security issues in static analysis\n`);
  }
}

async function main(): Promise<void> {
  console.log('🛡️ LEAVE TRACKER SECURITY VALIDATION');
  console.log('═'.repeat(50));
  console.log('This script validates the security implementations\n');

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      console.log('❌ Server health check failed. Make sure the development server is running.');
      console.log('   Run: npm run dev\n');
      return;
    }
    console.log('✅ Server is running and accessible\n');
  } catch (error) {
    console.log('❌ Cannot connect to server. Make sure it\'s running on port 3000.');
    console.log('   Run: npm run dev\n');
    return;
  }

  // Run static analysis
  performStaticSecurityAnalysis();

  // Run dynamic security tests
  await runSecurityTests();

  console.log('🔒 Security validation complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runSecurityTests, performStaticSecurityAnalysis };