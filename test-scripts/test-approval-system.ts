import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
let adminToken: string;
let testLeaveRequestId: string;

async function getAdminToken() {
  // Note: This assumes you have an admin user in your database
  // You should replace these credentials with your actual admin test account
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'admin123'
    })
  });

  const data = await response.json();
  return data.token;
}

async function createTestLeaveRequest() {
  // Create a test leave request
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: 'test-user-id', // Replace with an actual test user ID
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 172800000),  // Day after tomorrow
      type: 'ANNUAL',
      status: 'PENDING',
      comments: 'Test leave request'
    }
  });

  return leaveRequest.id;
}

async function testApproveRequest() {
  console.log('\n🧪 Testing Leave Request Approval...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/leave/request/${testLeaveRequestId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Approval test passed');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Approval test failed');
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('❌ Approval test error:', error);
  }
}

async function testRejectRequest() {
  console.log('\n🧪 Testing Leave Request Rejection...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/leave/request/${testLeaveRequestId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Test rejection reason'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Rejection test passed');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Rejection test failed');
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('❌ Rejection test error:', error);
  }
}

async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases...');

  // Test 1: Missing authentication
  try {
    const response = await fetch(`${API_BASE_URL}/leave/request/${testLeaveRequestId}/approve`, {
      method: 'POST'
    });
    console.log('Auth Test:', response.status === 401 ? '✅ Passed' : '❌ Failed');
  } catch (error) {
    console.error('Auth Test Error:', error);
  }

  // Test 2: Invalid request ID
  try {
    const response = await fetch(`${API_BASE_URL}/leave/request/invalid-id/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Invalid ID Test:', response.status === 404 ? '✅ Passed' : '❌ Failed');
  } catch (error) {
    console.error('Invalid ID Test Error:', error);
  }

  // Test 3: Missing rejection reason
  try {
    const response = await fetch(`${API_BASE_URL}/leave/request/${testLeaveRequestId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    console.log('Missing Reason Test:', response.status === 400 ? '✅ Passed' : '❌ Failed');
  } catch (error) {
    console.error('Missing Reason Test Error:', error);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    await prisma.leaveRequest.delete({
      where: { id: testLeaveRequestId }
    });
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function runTests() {
  console.log('🚀 Starting approval system tests...');

  try {
    // Setup
    adminToken = await getAdminToken();
    testLeaveRequestId = await createTestLeaveRequest();

    // Run tests
    await testApproveRequest();
    await testRejectRequest();
    await testErrorCases();
  } catch (error) {
    console.error('❌ Test setup error:', error);
  } finally {
    await cleanup();
  }
}

// Run the tests
runTests().catch(console.error);