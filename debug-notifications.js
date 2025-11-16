#!/usr/bin/env node

/**
 * Debug script to check notification counts
 * Run this to see what's happening with the notification system
 */

const fetch = require('node-fetch');

async function debugNotifications() {
  console.log('🔍 Debugging notification system...\n');
  
  try {
    // Check if the server is running
    const response = await fetch('http://localhost:3000/api/admin/stats');
    
    if (response.status === 401 || response.status === 403) {
      console.log('❌ Not authenticated - this is expected');
      console.log('💡 Please log in to the admin dashboard first, then run this script\n');
      return;
    }
    
    if (!response.ok) {
      console.log(`❌ Server error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('📊 Admin Stats API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data) {
      console.log('\n🎯 Key Notification Data:');
      console.log(`- Pending Requests (actionable): ${data.data.pendingRequests}`);
      console.log(`- TOIL Pending (actionable): ${data.data.toilPending}`);
      
      if (data.data._notificationBreakdown) {
        console.log('\n📋 Detailed Breakdown:');
        console.log(`- Total Pending Requests: ${data.data._notificationBreakdown.pendingRequests.total}`);
        console.log(`- Actionable Pending: ${data.data._notificationBreakdown.pendingRequests.actionable}`);
        console.log(`- Reference Pending: ${data.data._notificationBreakdown.pendingRequests.reference}`);
        console.log(`- Total Actionable: ${data.data._notificationBreakdown.totalActionable}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('💡 Make sure the development server is running (npm run dev)');
  }
}

debugNotifications();
