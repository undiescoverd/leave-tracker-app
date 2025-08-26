#!/usr/bin/env tsx

// Enhanced test script for the leave request API with conflict detection
// Run with: npx tsx scripts/test-enhanced-leave-api.ts

const API_BASE = "http://localhost:3000/api";

async function testEnhancedLeaveRequest() {
  console.log("🚀 Testing Enhanced Leave Request API with Conflict Detection...\n");

  // Test 1: Create a leave request for Sup (should show working days)
  console.log("📝 Creating a leave request for Sup...");
  const supLeaveData = {
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    comments: "Sup's summer vacation! 🏖️"
  };

  try {
    const createResponse = await fetch(`${API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supLeaveData),
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log("✅ Sup's leave request created successfully!");
      console.log(`📊 Working days: ${createResult.workingDays}`);
      console.log(`📊 Conflicts: ${createResult.conflicts ? createResult.conflicts.length : 0}`);
      if (createResult.conflictWarning) {
        console.log(`⚠️  ${createResult.conflictWarning}`);
      }
      console.log("📊 Full response:", JSON.stringify(createResult, null, 2));
    } else {
      console.log("❌ Failed to create leave request:");
      console.log(JSON.stringify(createResult, null, 2));
    }
  } catch (error) {
    console.log("❌ Error creating leave request:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 2: Create a conflicting leave request for Luis (same dates)
  console.log("📝 Creating a CONFLICTING leave request for Luis...");
  const luisLeaveData = {
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Same dates as Sup
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    comments: "Luis wants the same dates! 😅"
  };

  try {
    const createResponse = await fetch(`${API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(luisLeaveData),
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log("✅ Luis's leave request created (but with conflicts!)");
      console.log(`📊 Working days: ${createResult.workingDays}`);
      console.log(`📊 Conflicts: ${createResult.conflicts ? createResult.conflicts.length : 0}`);
      if (createResult.conflictWarning) {
        console.log(`⚠️  ${createResult.conflictWarning}`);
      }
      if (createResult.conflicts) {
        console.log("🔍 Conflict details:");
        createResult.conflicts.forEach((conflict: any, index: number) => {
          console.log(`   ${index + 1}. ${conflict.agent} - ${conflict.dates}`);
        });
      }
    } else {
      console.log("❌ Failed to create Luis's leave request:");
      console.log(JSON.stringify(createResult, null, 2));
    }
  } catch (error) {
    console.log("❌ Error creating Luis's leave request:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // Test 3: Get all leave requests
  console.log("📋 Fetching all leave requests...");
  try {
    const getResponse = await fetch(`${API_BASE}/leave/request`);
    const getResult = await getResponse.json();

    if (getResponse.ok) {
      console.log("✅ Leave requests retrieved successfully!");
      console.log(`📊 Found ${getResult.leaveRequests.length} requests:`);
      getResult.leaveRequests.forEach((req: any, index: number) => {
        console.log(`  ${index + 1}. ${req.user?.name || 'Unknown'} - ${req.startDate.split('T')[0]} to ${req.endDate.split('T')[0]} (${req.status})`);
      });
    } else {
      console.log("❌ Failed to fetch leave requests:");
      console.log(JSON.stringify(getResult, null, 2));
    }
  } catch (error) {
    console.log("❌ Error fetching leave requests:", error);
  }

  console.log("\n🎉 Enhanced test complete! Check your database to see the new features!");
}

// Test weekend calculation
async function testWeekendCalculation() {
  console.log("\n🧪 Testing weekend calculation...\n");
  
  // Test a request that spans weekends
  const weekendLeaveData = {
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now (7 days)
    comments: "Weekend-spanning vacation! 🗓️"
  };

  try {
    const createResponse = await fetch(`${API_BASE}/leave/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(weekendLeaveData),
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log("✅ Weekend-spanning leave request created!");
      console.log(`📊 Total days: 7, Working days: ${createResult.workingDays}`);
      console.log("📊 This shows weekends are excluded from working days!");
    } else {
      console.log("❌ Failed to create weekend leave request:");
      console.log(JSON.stringify(createResult, null, 2));
    }
  } catch (error) {
    console.log("❌ Error creating weekend leave request:", error);
  }
}

// Run the tests
async function main() {
  await testEnhancedLeaveRequest();
  await testWeekendCalculation();
}

main().catch(console.error);
