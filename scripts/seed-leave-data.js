// Simple script to add dummy leave data
// Run with: node -e "require('./scripts/seed-leave-data.js')"

const dummyData = {
  // Replace these with actual user IDs from your system
  users: [
    'cmey7qzzn00022je9ybnk0eap', // Replace with actual user ID 1
    'USER_ID_2' // Replace with actual user ID 2
  ],
  
  // Sample leave requests (you'll need to adjust the SQL)
  leaveRequests: [
    // 2024 Historical data
    { period: '2024-01-15 to 2024-01-19', type: 'ANNUAL', status: 'APPROVED', hours: 40, comment: 'New Year break' },
    { period: '2024-03-12 to 2024-03-13', type: 'SICK', status: 'APPROVED', hours: 16, comment: 'Flu symptoms' },
    { period: '2024-05-20 to 2024-05-24', type: 'ANNUAL', status: 'APPROVED', hours: 40, comment: 'Spring holiday' },
    { period: '2024-07-08 to 2024-07-10', type: 'UNPAID', status: 'APPROVED', hours: 24, comment: 'Family emergency' },
    { period: '2024-08-12 to 2024-08-23', type: 'ANNUAL', status: 'APPROVED', hours: 80, comment: 'Summer vacation' },
    { period: '2024-10-14 to 2024-10-14', type: 'SICK', status: 'APPROVED', hours: 8, comment: 'Doctor appointment' },
    { period: '2024-12-23 to 2024-12-31', type: 'ANNUAL', status: 'APPROVED', hours: 56, comment: 'Christmas holidays' },
    
    // 2025 Current year data
    { period: '2025-01-20 to 2025-01-24', type: 'ANNUAL', status: 'APPROVED', hours: 40, comment: 'Winter break' },
    { period: '2025-02-14 to 2025-02-16', type: 'UNPAID', status: 'APPROVED', hours: 24, comment: 'Personal matters' },
    { period: '2025-03-18 to 2025-03-18', type: 'SICK', status: 'APPROVED', hours: 8, comment: 'Migraine' },
    { period: '2025-04-07 to 2025-04-11', type: 'ANNUAL', status: 'APPROVED', hours: 40, comment: 'Easter holidays' },
    { period: '2025-06-16 to 2025-06-18', type: 'UNPAID', status: 'APPROVED', hours: 24, comment: 'Wedding preparation' },
    
    // Pending requests for 2025
    { period: '2025-09-15 to 2025-09-19', type: 'ANNUAL', status: 'PENDING', hours: 40, comment: 'Autumn break' },
    { period: '2025-10-28 to 2025-10-31', type: 'ANNUAL', status: 'PENDING', hours: 32, comment: 'Half-term holiday' },
    { period: '2025-11-25 to 2025-11-26', type: 'UNPAID', status: 'PENDING', hours: 16, comment: 'Extended weekend' },
    { period: '2025-12-22 to 2025-12-31', type: 'ANNUAL', status: 'PENDING', hours: 64, comment: 'Christmas and New Year' }
  ]
};

console.log('📋 Dummy Leave Data Template Generated');
console.log('\n🚀 To add this data to your database:');
console.log('1. Get your actual user IDs by visiting /admin/employee-balances');
console.log('2. Update the users array above with real IDs');
console.log('3. Use Prisma Studio or direct SQL inserts');
console.log('\n📊 Data Summary:');
console.log(`• Historical requests (2024): 7 per user`);
console.log(`• Current year approved (2025): 6 per user`);
console.log(`• Pending requests (2025): 4 per user`);
console.log(`• Unpaid leave requests: 3 per user`);
console.log(`• Mix of all leave types: ANNUAL, SICK, UNPAID`);

module.exports = dummyData;