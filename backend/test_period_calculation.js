// Test period calculation for 2023
function testPeriodCalculation() {
  console.log('=== Testing Period Calculation for 2023 (Local Timezone) ===');
  
  const year = 2023;
  const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0); // Local time
  console.log('First day of 2023 (local):', firstDayOfYear.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  console.log('First day of 2023 (UTC):', firstDayOfYear.toISOString());
  
  const firstSunday = new Date(firstDayOfYear);
  const dayOfWeek = firstDayOfYear.getDay();
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  firstSunday.setDate(firstDayOfYear.getDate() + daysToAdd);
  
  console.log('First Sunday of 2023 (local):', firstSunday.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  console.log('First Sunday of 2023 (UTC):', firstSunday.toISOString());
  
  // Test P1 to P5
  for (let p = 1; p <= 5; p++) {
    const periodStart = new Date(firstSunday);
    periodStart.setDate(firstSunday.getDate() + (p - 1) * 28);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 27);
    
    console.log(`P${p}: ${periodStart.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })} (${periodStart.toDateString().split(' ')[0]}) to ${periodEnd.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })} (${periodEnd.toDateString().split(' ')[0]})`);
  }
}

// Run the test
testPeriodCalculation();
