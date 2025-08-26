#!/usr/bin/env tsx

// Test script for STEP 2: GET endpoint for user's leave requests
// Run with: npx tsx scripts/test-step2.ts

const API_BASE = "http://localhost:3001/api";

async function testStep2() {
  console.log("🚀 Testing STEP 2: GET Endpoint for User's Leave Requests\n");

  // Test 1: Try to get leave requests without authentication
  console.log("📝 Test 1: Getting leave requests without authentication...");
  try {
    const response = await fetch(`${API_BASE}/leave/requests`, {
      redirect: 'manual' // Don't follow redirects
    });
    
    if (response.status === 307 || response.status === 302) {
      console.log("✅ Authentication check working correctly!");
      console.log(`📊 Status: ${response.status} (Redirect to login)`);
      console.log(`📊 Location: ${response.headers.get('location')}`);
    } else if (!response.ok) {
      console.log("✅ Authentication check working correctly!");
      console.log(`📊 Status: ${response.status}`);
      const result = await response.json();
      console.log("📊 Response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Should have required authentication but didn't");
    }
  } catch (error) {
    console.log("❌ Error testing authentication:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Test with different status filters
  console.log("📝 Test 2: Testing status filters (without auth)...");
  const statusFilters = ['PENDING', 'APPROVED', 'REJECTED'];
  
  for (const status of statusFilters) {
    try {
      const response = await fetch(`${API_BASE}/leave/requests?status=${status}`, {
        redirect: 'manual' // Don't follow redirects
      });
      if (response.status === 307 || response.status === 302) {
        console.log(`📊 Status filter '${status}': ${response.status} (Redirect to login)`);
      } else {
        console.log(`📊 Status filter '${status}': ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error with status filter '${status}':`, error);
    }
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("🎉 STEP 2 Testing Complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. Login via the UI at http://localhost:3001/login");
  console.log("2. Use Postman/Thunder Client to test with authentication");
  console.log("3. Test GET /api/leave/requests");
  console.log("4. Test with query params: /api/leave/requests?status=PENDING");
}

testStep2().catch(console.error);
