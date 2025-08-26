#!/usr/bin/env tsx

// Quick test script for the leave request API
// Run with: npx tsx scripts/test-leave-api.ts

const LEAVE_API_BASE = "http://localhost:3000/api";

async function testLeaveRequest() {
  console.log("🚀 Testing Leave Request API...\n");

  // Test 1: Create a leave request
  console.log("📝 Creating a leave request...");
  const leaveData = {
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    comments: "Summer vacation with the family! 🏖️"
  };

  try {
    const createResponse = await fetch(`${LEAVE_API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leaveData),
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log("✅ Leave request created successfully!");
      console.log("📊 Response:", JSON.stringify(createResult, null, 2));
    } else {
      console.log("❌ Failed to create leave request:");
      console.log(JSON.stringify(createResult, null, 2));
    }
  } catch (error) {
    console.log("❌ Error creating leave request:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Get all leave requests
  console.log("📋 Fetching all leave requests...");
  try {
    const getResponse = await fetch(`${LEAVE_API_BASE}/leave/request`);
    const getResult = await getResponse.json();

    if (getResponse.ok) {
      console.log("✅ Leave requests retrieved successfully!");
      console.log(`📊 Found ${getResult.leaveRequests.length} requests:`);
      getResult.leaveRequests.forEach((req: any, index: number) => {
        console.log(`  ${index + 1}. ${req.user?.name || 'Unknown'} - ${req.startDate} to ${req.endDate} (${req.status})`);
      });
    } else {
      console.log("❌ Failed to fetch leave requests:");
      console.log(JSON.stringify(getResult, null, 2));
    }
  } catch (error) {
    console.log("❌ Error fetching leave requests:", error);
  }

  console.log("\n🎉 Test complete! Check your database to see the new leave request!");
}

// Test validation errors
async function testValidationErrors() {
  console.log("\n🧪 Testing validation errors...\n");

  // Test 1: Invalid dates (end before start)
  console.log("📝 Testing invalid date range...");
  const invalidDates = {
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // End before start
    comments: "This should fail"
  };

  try {
    const response = await fetch(`${LEAVE_API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidDates),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.log("✅ Validation error caught correctly!");
      console.log("📊 Error:", result.error);
    } else {
      console.log("❌ Validation should have failed but didn't");
    }
  } catch (error) {
    console.log("❌ Error testing validation:", error);
  }
}

// Run the tests
async function main() {
  await testLeaveRequest();
  await testValidationErrors();
}

main().catch(console.error);
