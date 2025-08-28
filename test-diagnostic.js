#!/usr/bin/env node

const BASE_URL = "http://localhost:3000";

async function runDiagnostics() {
  console.log("🔍 Running Comprehensive Diagnostics");
  console.log("===================================\n");

  // Test 1: Health Check
  console.log("📋 Test 1: Health Check");
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Server Status:", healthData.status);
    console.log("✅ Database:", healthData.environment.hasDatabase ? "Connected" : "Not Connected");
    console.log("✅ Auth:", healthData.environment.hasAuth ? "Configured" : "Not Configured");
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    return;
  }

  // Test 2: Authentication Flow
  console.log("\n📋 Test 2: Authentication Flow");
  try {
    const protectedEndpoints = [
      "/api/leave/balance",
      "/api/leave/request",
      "/api/leave/requests",
      "/api/admin/toil",
      "/api/users"
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (response.status === 401 || response.redirected) {
        console.log(`✅ ${endpoint}: Protected (${response.status})`);
      } else {
        console.log(`⚠️  ${endpoint}: Not properly protected (${response.status})`);
      }
    }
  } catch (error) {
    console.log("❌ Auth flow test failed:", error.message);
  }

  // Test 3: Database Schema
  console.log("\n📋 Test 3: Database Schema");
  try {
    const response = await fetch(`${BASE_URL}/api/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkSchema" })
    });
    
    if (response.ok) {
      console.log("✅ Database schema validation passed");
    } else {
      console.log("⚠️  Database schema validation failed");
    }
  } catch (error) {
    console.log("❌ Schema test failed:", error.message);
  }

  // Test 4: TOIL Features
  console.log("\n📋 Test 4: TOIL Features");
  try {
    const response = await fetch(`${BASE_URL}/api/admin/toil`);
    if (response.status === 401 || response.redirected) {
      console.log("✅ TOIL API endpoints configured");
    } else {
      console.log("⚠️  TOIL API endpoints not properly configured");
    }
  } catch (error) {
    console.log("❌ TOIL test failed:", error.message);
  }

  // Test 5: Static Assets
  console.log("\n📋 Test 5: Static Assets");
  const assets = [
    "/favicon.ico",
    "/_next/static/chunks/main.js",
    "/_next/static/css/app.css"
  ];

  for (const asset of assets) {
    try {
      const response = await fetch(`${BASE_URL}${asset}`);
      console.log(`${response.ok ? "✅" : "⚠️ "} ${asset}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${asset}: Failed to load`);
    }
  }

  // Test 6: Environment Configuration
  console.log("\n📋 Test 6: Environment Configuration");
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    console.log("✅ Node Environment:", data.environment.nodeEnv);
    console.log("✅ Database:", data.environment.hasDatabase ? "Available" : "Not Available");
    console.log("✅ Auth:", data.environment.hasAuth ? "Configured" : "Not Configured");
  } catch (error) {
    console.log("❌ Environment check failed:", error.message);
  }

  // Test 7: API Response Format
  console.log("\n📋 Test 7: API Response Format");
  try {
    const endpoints = [
      "/api/health",
      "/api/leave/balance",
      "/api/leave/requests"
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const contentType = response.headers.get("content-type");
      console.log(`${contentType?.includes("application/json") ? "✅" : "⚠️ "} ${endpoint}: ${contentType}`);
    }
  } catch (error) {
    console.log("❌ API format test failed:", error.message);
  }

  console.log("\n🎯 Diagnostics Complete!");
  console.log("\n📋 Next Steps:");
  console.log("1. Check any warnings or errors in the test results");
  console.log("2. Verify TOIL features are enabled in .env.local");
  console.log("3. Test the UI manually at http://localhost:3000");
  console.log("4. Try logging in with test accounts:");
  console.log("   - Admin: senay.taormina@tdhagency.com");
  console.log("   - User: sup.dhanasunthorn@tdhagency.com");
}

runDiagnostics().catch(console.error);
