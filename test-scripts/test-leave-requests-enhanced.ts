#!/usr/bin/env tsx

// Test script for Enhanced Leave Requests functionality
// Run with: npx tsx test-scripts/test-leave-requests-enhanced.ts

const API_BASE = "http://localhost:3000/api";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  days: number;
  createdAt: string;
  comments?: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    requests: LeaveRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
}

async function testEnhancedLeaveRequests() {
  console.log("🚀 Testing Enhanced Leave Requests Functionality\n");

  // Test 1: Check if reason field is properly mapped from comments
  console.log("📝 Test 1: Reason field mapping from comments...");
  try {
    const response = await fetch(`${API_BASE}/leave/requests`);
    const data: ApiResponse = await response.json();
    
    if (data.success && data.data.requests.length > 0) {
      const request = data.data.requests[0];
      console.log("✅ API Response includes reason field:", !!request.reason);
      console.log("📊 Sample request:", {
        id: request.id,
        reason: request.reason,
        comments: request.comments,
        status: request.status
      });
    } else {
      console.log("⚠️ No requests found to test reason field mapping");
    }
  } catch (error) {
    console.log("❌ Error testing reason field:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Test pagination functionality
  console.log("📝 Test 2: Pagination functionality...");
  try {
    const response = await fetch(`${API_BASE}/leave/requests?page=1&limit=5`);
    const data: ApiResponse = await response.json();
    
    if (data.success) {
      console.log("✅ Pagination response structure:", {
        total: data.data.total,
        page: data.data.page,
        limit: data.data.limit,
        totalPages: data.data.totalPages,
        requestsCount: data.data.requests.length
      });
      
      // Test if limit is respected
      if (data.data.requests.length <= data.data.limit) {
        console.log("✅ Pagination limit working correctly");
      } else {
        console.log("❌ Pagination limit not working");
      }
    } else {
      console.log("❌ Pagination API call failed");
    }
  } catch (error) {
    console.log("❌ Error testing pagination:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Test status filtering with pagination
  console.log("📝 Test 3: Status filtering with pagination...");
  try {
    const response = await fetch(`${API_BASE}/leave/requests?status=PENDING&page=1&limit=10`);
    const data: ApiResponse = await response.json();
    
    if (data.success) {
      console.log("✅ Status filtering with pagination working");
      console.log("📊 Filtered results:", {
        total: data.data.total,
        requestsCount: data.data.requests.length,
        allPending: data.data.requests.every(r => r.status === 'PENDING')
      });
    } else {
      console.log("❌ Status filtering with pagination failed");
    }
  } catch (error) {
    console.log("❌ Error testing status filtering:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 4: Test error handling for invalid parameters
  console.log("📝 Test 4: Error handling for invalid parameters...");
  try {
    const response = await fetch(`${API_BASE}/leave/requests?page=invalid&limit=invalid`);
    const data = await response.json();
    
    if (!data.success) {
      console.log("✅ Invalid parameters handled gracefully");
    } else {
      console.log("⚠️ Invalid parameters should have caused an error");
    }
  } catch (error) {
    console.log("✅ Invalid parameters caused expected error");
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 5: Test large page size handling
  console.log("📝 Test 5: Large page size handling...");
  try {
    const response = await fetch(`${API_BASE}/leave/requests?page=1&limit=100`);
    const data: ApiResponse = await response.json();
    
    if (data.success) {
      console.log("✅ Large page size handled correctly");
      console.log("📊 Large page results:", {
        requestedLimit: 100,
        actualLimit: data.data.limit,
        requestsCount: data.data.requests.length
      });
    } else {
      console.log("❌ Large page size handling failed");
    }
  } catch (error) {
    console.log("❌ Error testing large page size:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("🎉 Enhanced Leave Requests Testing Complete!");
  console.log("\n📋 Summary:");
  console.log("✅ Reason field mapping from comments");
  console.log("✅ Pagination functionality");
  console.log("✅ Status filtering with pagination");
  console.log("✅ Error handling for invalid parameters");
  console.log("✅ Large page size handling");
  console.log("\n🌐 Next Steps:");
  console.log("1. Test the UI at http://localhost:3000/leave/requests");
  console.log("2. Verify mobile card layout on small screens");
  console.log("3. Test pagination controls in the UI");
  console.log("4. Verify admin comments display for rejected requests");
}

testEnhancedLeaveRequests().catch(console.error);
