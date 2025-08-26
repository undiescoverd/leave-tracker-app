#!/usr/bin/env tsx

// Test admin login and approval system
// Run with: npx tsx scripts/test-admin-login.ts

const API_BASE = "http://localhost:3000/api";

async function testAdminLogin() {
  console.log("🚀 Testing Admin Login and Approval System...\n");

  // Test admin login
  console.log("👑 Testing admin login...");
  const loginData = {
    email: "ian.vincent@tdhagency.com",
    password: "Password123!"
  };

  try {
    const loginResponse = await fetch(`${API_BASE}/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: loginData.email,
        password: loginData.password,
        callbackUrl: "/dashboard",
        json: "true"
      }),
    });

    if (loginResponse.ok) {
      console.log("✅ Admin login successful!");
      
      // Now test the approval system
      await testApprovalSystem();
    } else {
      console.log("❌ Admin login failed");
      console.log("💡 You can manually log in as an admin user:");
      console.log("   Email: ian.vincent@tdhagency.com");
      console.log("   Password: Password123!");
      console.log("   Or: senay.taormina@tdhagency.com");
    }
  } catch (error) {
    console.log("❌ Error during admin login:", error);
  }
}

async function testApprovalSystem() {
  console.log("\n📋 Fetching all leave requests...");
  try {
    const getResponse = await fetch(`${API_BASE}/leave/request`);
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
      const approveResponse = await fetch(`${API_BASE}/leave/request/${firstPending.id}/approve`, {
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

    } else {
      console.log("❌ No leave requests found or failed to fetch");
    }
  } catch (error) {
    console.log("❌ Error testing approval system:", error);
  }

  console.log("\n🎉 Admin approval system test complete!");
}

// Run the test
testAdminLogin().catch(console.error);
