const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token

async function testWorkOrderVolumeTrend() {
  try {
    console.log('Testing Work Order Volume Trend endpoint...');
    
    const response = await axios.get(`${BASE_URL}/dashboard/workorder-volume-trend`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        groupBy: 'daily',
        // woType: 1,
        // department: 2,
        // site: 1,
        // assign: 21
      }
    });

    console.log('✅ Success!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test different grouping options
async function testAllGroupings() {
  const groupings = ['daily', 'weekly', 'monthly'];
  
  for (const groupBy of groupings) {
    console.log(`\n--- Testing ${groupBy} grouping ---`);
    try {
      const response = await axios.get(`${BASE_URL}/dashboard/workorder-volume-trend`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: groupBy
        }
      });

      console.log(`✅ ${groupBy} grouping successful`);
      console.log(`Trend data points: ${response.data.data.trend.length}`);
      console.log(`Total work orders: ${response.data.data.summary.totalWorkOrders}`);
      
    } catch (error) {
      console.error(`❌ ${groupBy} grouping failed:`, error.response?.data || error.message);
    }
  }
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Work Order Volume Trend API tests...\n');
  
  // Test basic functionality
  testWorkOrderVolumeTrend();
  
  // Test all groupings
  setTimeout(() => {
    testAllGroupings();
  }, 2000);
}

module.exports = {
  testWorkOrderVolumeTrend,
  testAllGroupings
};
