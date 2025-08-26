#!/usr/bin/env tsx

// Test script for the approval system
// Run with: npx tsx scripts/test-approval-system.ts

const APPROVAL_API_BASE = "http://localhost:3000/api";

async function testApprovalSystem() {
  console.log("🚀 Testing Approval System...\n");

  // First, let's get all leave requests to see what we have
  console.log("📋 Fetching all leave requests...");
  try {
    const getResponse = await fetch(`${APPROVAL_API_BASE}/leave/request`);
    const getResult = await getResponse.json();

    if (getResponse.ok && getResult.leaveRequests.length > 0) {
      console.log(`✅ Found ${getResult.leaveRequests.length} leave requests:`);
      
      const pendingRequests = getResult.leaveRequests.filter((req: any) => req.status === 'PENDING');
      
      if (pendingRequests.length === 0) {
        console.log("❌ No pending requests to approve/reject");
        return;
      }

      const firstPending = pendingRequests[0];
      console.log(`🎯 Testing with request: ${firstPending.id} (${firstPending.user.name})`);

      // Test approval
      console.log("\n✅ Testing approval...");
      const approveResponse = await fetch(`${APPROVAL_API_BASE}/leave/request/${firstPending.id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const approveResult = await approveResponse.json();
      
      if (approveResponse.ok) {
        console.log("✅ Leave request approved successfully!");
        console.log("📊 Response:", JSON.stringify(approveResult, null, 2));
      } else {
        console.log("❌ Failed to approve leave request:");
        console.log(JSON.stringify(approveResult, null, 2));
      }

      // Test rejection (we'll need to create another request first)
      console.log("\n📝 Creating another request for rejection test...");
      const newRequestData = {
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
        comments: "Test request for rejection"
      };

      const createResponse = await fetch(`${APPROVAL_API_BASE}/leave/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRequestData),
      });

      const createResult = await createResponse.json();
      
      if (createResponse.ok) {
        console.log("✅ New request created for rejection test");
        
        // Test rejection
        console.log("\n❌ Testing rejection...");
        const rejectResponse = await fetch(`${APPROVAL_API_BASE}/leave/request/${createResult.leaveRequest.id}/reject`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const rejectResult = await rejectResponse.json();
        
        if (rejectResponse.ok) {
          console.log("✅ Leave request rejected successfully!");
          console.log("📊 Response:", JSON.stringify(rejectResult, null, 2));
        } else {
          console.log("❌ Failed to reject leave request:");
          console.log(JSON.stringify(rejectResult, null, 2));
        }
      } else {
        console.log("❌ Failed to create test request for rejection");
      }

    } else {
      console.log("❌ No leave requests found or failed to fetch");
    }
  } catch (error) {
    console.log("❌ Error testing approval system:", error);
  }

  console.log("\n🎉 Approval system test complete!");
}

// Run the test
testApprovalSystem().catch(console.error);
