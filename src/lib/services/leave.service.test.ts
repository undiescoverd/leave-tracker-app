import { calculateLeaveDays } from './leave.service';

// Quick test for leave day calculations
function testLeaveDayCalculations() {
  console.log("🧪 Testing Leave Day Calculations...\n");

  // Test 1: Monday to Friday (5 working days)
  const start1 = new Date('2024-12-23'); // Monday
  const end1 = new Date('2024-12-27'); // Friday
  const days1 = calculateLeaveDays(start1, end1);
  console.log(`📅 Monday to Friday (should be 5): ${days1} days`);

  // Test 2: Including weekend (should still be 5 working days)
  const start2 = new Date('2024-12-21'); // Saturday
  const end2 = new Date('2024-12-29'); // Sunday
  const days2 = calculateLeaveDays(start2, end2);
  console.log(`📅 Including weekend (should be 5): ${days2} days`);

  // Test 3: Single day (Monday)
  const start3 = new Date('2024-12-23'); // Monday
  const end3 = new Date('2024-12-23'); // Monday
  const days3 = calculateLeaveDays(start3, end3);
  console.log(`📅 Single Monday (should be 1): ${days3} days`);

  // Test 4: Weekend only (should be 0)
  const start4 = new Date('2024-12-21'); // Saturday
  const end4 = new Date('2024-12-22'); // Sunday
  const days4 = calculateLeaveDays(start4, end4);
  console.log(`📅 Weekend only (should be 0): ${days4} days`);

  // Test 5: Long period (2 weeks)
  const start5 = new Date('2024-12-23'); // Monday
  const end5 = new Date('2025-01-03'); // Friday (2 weeks later)
  const days5 = calculateLeaveDays(start5, end5);
  console.log(`📅 2 weeks (should be 10): ${days5} days`);

  console.log("\n✅ Leave day calculation tests complete!");
}

// Run the tests
testLeaveDayCalculations();
