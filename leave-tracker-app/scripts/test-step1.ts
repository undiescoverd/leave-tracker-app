#!/usr/bin/env tsx

// Test script for STEP 1: POST endpoint for leave requests
// Run with: npx tsx scripts/test-step1.ts

const STEP1_API_BASE = "http://localhost:3000/api";

async function testStep1() {
  console.log("🚀 Testing STEP 1: POST Endpoint for Leave Requests\n");

  // Test 1: Try to create a leave request without authentication
  console.log("📝 Test 1: Creating a leave request without authentication...");
  const leaveData = {
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    reason: "Summer vacation with the family! 🏖️"
  };

  try {
    const createResponse = await fetch(`${STEP1_API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leaveData),
    });

    const createResult = await createResponse.json();
    
    if (!createResponse.ok) {
      console.log("✅ Authentication check working correctly!");
      console.log("📊 Response:", JSON.stringify(createResult, null, 2));
    } else {
      console.log("❌ Should have required authentication but didn't");
    }
  } catch (error) {
    console.log("❌ Error testing authentication:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Test validation with invalid data
  console.log("📝 Test 2: Testing validation with invalid data...");
  const invalidData = {
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // End before start
    reason: "" // Empty reason
  };

  try {
    const response = await fetch(`${STEP1_API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.log("✅ Validation working correctly!");
      console.log("📊 Error response:", JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Validation should have failed but didn't");
    }
  } catch (error) {
    console.log("❌ Error testing validation:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("🎉 STEP 1 Testing Complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. Login via the UI at 
    http://localhost:3000/login");
  console.log("2. Use Postman/Thunder Client to test with authentication");
  console.log("3. Test with valid data: " + JSON.stringify(leaveData, null, 2));
}

testStep1().catch(console.error);
