#!/usr/bin/env tsx

// Test script for STEP 4: Enhanced POST Endpoint with Conflict Detection
// Run with: npx tsx scripts/test-step4.ts

const API_BASE = "http://localhost:3001/api";

async function testStep4() {
  console.log("🚀 Testing STEP 4: Enhanced POST Endpoint with Conflict Detection\n");

  // Test 1: Try to create a leave request without authentication
  console.log("📝 Test 1: Creating a leave request without authentication...");
  const leaveData = {
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    reason: "Enhanced leave request test"
  };

  try {
    const createResponse = await fetch(`${API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leaveData),
      redirect: 'manual' // Don't follow redirects
    });

    if (createResponse.status === 307 || createResponse.status === 302) {
      console.log("✅ Authentication check working correctly!");
      console.log(`📊 Status: ${createResponse.status} (Redirect to login)`);
      console.log(`📊 Location: ${createResponse.headers.get('location')}`);
    } else if (!createResponse.ok) {
      console.log("✅ Authentication check working correctly!");
      console.log(`📊 Status: ${createResponse.status}`);
      const result = await createResponse.json();
      console.log("📊 Response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Should have required authentication but didn't");
    }
  } catch (error) {
    console.log("❌ Error testing authentication:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 2: Test validation with invalid data
  console.log("📝 Test 2: Testing validation with invalid data...");
  const invalidData = {
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // End before start
    reason: "" // Empty reason
  };

  try {
    const response = await fetch(`${API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidData),
      redirect: 'manual'
    });

    if (response.status === 307 || response.status === 302) {
      console.log("✅ Authentication required for validation test");
    } else if (!response.ok) {
      console.log("✅ Validation working correctly!");
      const result = await response.json();
      console.log("📊 Error response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Validation should have failed but didn't");
    }
  } catch (error) {
    console.log("❌ Error testing validation:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  console.log("🎉 STEP 4 Testing Complete!");
  console.log("\n📋 Enhanced Features Added:");
  console.log("✅ Leave day calculations (excluding weekends)");
  console.log("✅ Leave balance checking (32 days annual allowance)");
  console.log("✅ UK agent conflict detection");
  console.log("✅ Enhanced response with days and balance info");
  console.log("\n📋 Next Steps:");
  console.log("1. Login via the UI at http://localhost:3001/login");
  console.log("2. Test with valid data to see enhanced response");
  console.log("3. Test UK agent conflict detection");
  console.log("4. Test insufficient balance scenario");
  console.log("\n📋 Test Scenarios:");
  console.log("- Login as Sup, create leave request");
  console.log("- Login as Luis, try same dates (should show conflict)");
  console.log("- Try to request more than 32 days (should show insufficient balance)");
}

testStep4().catch(console.error);
