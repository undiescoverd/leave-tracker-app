// Quick test script to debug leave submission
async function testLeaveSubmission() {
  try {
    console.log('🧪 Testing leave submission...');
    
    // Test leave request endpoint directly (will fail without auth, but should return proper error)
    const leaveResponse = await fetch('http://localhost:3002/api/leave/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: new Date('2024-12-01').toISOString(),
        endDate: new Date('2024-12-05').toISOString(),
        reason: 'Test leave request',
        type: 'ANNUAL'
      })
    });
    
    const leaveResult = await leaveResponse.json();
    console.log('Leave API status:', leaveResponse.status);
    console.log('Leave API response:', leaveResult);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLeaveSubmission();