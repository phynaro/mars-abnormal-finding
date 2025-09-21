const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

// Test data
const testCases = [
  {
    name: 'Basic KPI Test - Current Period Only',
    params: {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    }
  },
  {
    name: 'KPI Test with Comparison Period',
    params: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      compare_startDate: '2023-12-01',
      compare_endDate: '2023-12-31'
    }
  },
  {
    name: 'KPI Test with Area Filter',
    params: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      compare_startDate: '2023-12-01',
      compare_endDate: '2023-12-31',
      area_id: 1
    }
  },
  {
    name: 'Error Test - Missing Required Parameters',
    params: {
      startDate: '2024-01-01'
      // Missing endDate
    },
    expectError: true
  }
];

async function testAbnormalFindingKPIs() {
  console.log('🧪 Testing Abnormal Finding KPI Endpoint');
  console.log('=====================================\n');

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`📊 Parameters:`, testCase.params);
    
    try {
      const response = await axios.get(`${BASE_URL}/dashboard/af`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: testCase.params
      });

      if (testCase.expectError) {
        console.log('❌ Expected error but got success response');
        console.log('Response:', response.data);
      } else {
        console.log('✅ Success Response');
        console.log('Status:', response.status);
        
        // Validate response structure
        const data = response.data;
        if (data.success && data.data) {
          console.log('📈 KPIs:', {
            totalTicketsThisPeriod: data.data.kpis?.totalTicketsThisPeriod,
            closedTicketsThisPeriod: data.data.kpis?.closedTicketsThisPeriod,
            pendingTicketsThisPeriod: data.data.kpis?.pendingTicketsThisPeriod,
            totalCostAvoidanceThisPeriod: data.data.kpis?.totalCostAvoidanceThisPeriod,
            totalDowntimeAvoidanceThisPeriod: data.data.kpis?.totalDowntimeAvoidanceThisPeriod
          });
          
          console.log('🏆 Top Performers:', {
            topReporter: data.data.topPerformers?.topReporter?.personName,
            topCostSaver: data.data.topPerformers?.topCostSaver?.personName,
            topDowntimeSaver: data.data.topPerformers?.topDowntimeSaver?.personName
          });
          
          console.log('📊 Comparison Metrics:', data.data.summary?.comparisonMetrics);
        } else {
          console.log('⚠️  Unexpected response structure:', data);
        }
      }
    } catch (error) {
      if (testCase.expectError) {
        console.log('✅ Expected Error Received');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message);
      } else {
        console.log('❌ Unexpected Error');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message || error.message);
      }
    }
    
    console.log('---\n');
  }
}

// Manual test function for quick testing
async function quickTest() {
  console.log('🚀 Quick Test - Abnormal Finding KPI');
  console.log('===================================\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/dashboard/af`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        compare_startDate: '2023-12-01',
        compare_endDate: '2023-12-31'
      }
    });

    console.log('✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
    console.log('Full Error:', error.response?.data);
  }
}

// Run tests
if (require.main === module) {
  console.log('⚠️  IMPORTANT: Please update TEST_TOKEN with a valid JWT token before running tests\n');
  
  // Uncomment the test you want to run:
  // testAbnormalFindingKPIs();
  quickTest();
}

module.exports = {
  testAbnormalFindingKPIs,
  quickTest
};
