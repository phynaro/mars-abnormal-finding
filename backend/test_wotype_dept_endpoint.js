const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token

// Test the new WOType and Department backlog endpoint
async function testWOTypeDeptEndpoint() {
  console.log('🧪 Testing WOType and Department Backlog Endpoint');
  console.log('=' .repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/backlog/wotype-dept`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        siteNo: 3
      }
    });

    console.log('✅ Request successful!');
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Validate response structure
    const { success, data } = response.data;
    
    if (success && data && data.backlog && data.summary) {
      console.log('\n✅ Response structure is valid');
      console.log(`📈 Total Work Orders: ${data.summary.totalWorkOrders}`);
      console.log(`🏢 Total Departments: ${data.summary.totalDepartments}`);
      console.log(`🔧 Total WO Types: ${data.summary.totalWOTypes}`);
      console.log(`📊 Total Statuses: ${data.summary.totalStatuses}`);
      console.log(`🏭 Site Number: ${data.summary.siteNo}`);
      
      console.log('\n📋 Sample Backlog Items:');
      data.backlog.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. Dept: ${item.deptCode} (${item.deptNo}) | WOType: ${item.woTypeCode} (${item.woTypeNo}) | Status: ${item.woStatusCode} (${item.woStatusNo}) | Total: ${item.total}`);
      });

      // Group by department for analysis
      const deptGroups = {};
      data.backlog.forEach(item => {
        if (!deptGroups[item.deptCode]) {
          deptGroups[item.deptCode] = {
            total: 0,
            woTypes: new Set(),
            statuses: new Set()
          };
        }
        deptGroups[item.deptCode].total += item.total;
        deptGroups[item.deptCode].woTypes.add(item.woTypeCode);
        deptGroups[item.deptCode].statuses.add(item.woStatusCode);
      });

      console.log('\n📊 Department Summary:');
      Object.entries(deptGroups).forEach(([deptCode, stats]) => {
        console.log(`${deptCode}: ${stats.total} work orders, ${stats.woTypes.size} WO types, ${stats.statuses.size} statuses`);
      });

    } else {
      console.log('❌ Invalid response structure');
    }

  } catch (error) {
    console.error('❌ Request failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test with different site numbers
async function testDifferentSites() {
  console.log('\n\n🌐 Testing Different Site Numbers');
  console.log('=' .repeat(60));

  const sites = [1, 2, 3];
  
  for (const siteNo of sites) {
    try {
      console.log(`\n🏭 Testing Site ${siteNo}:`);
      const response = await axios.get(`${BASE_URL}/backlog/wotype-dept`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: { siteNo }
      });

      if (response.data.success) {
        console.log(`✅ Site ${siteNo}: ${response.data.data.summary.totalWorkOrders} work orders`);
      }
    } catch (error) {
      console.log(`❌ Site ${siteNo}: ${error.response?.status || error.message}`);
    }
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n\n🚨 Testing Error Handling');
  console.log('=' .repeat(60));

  // Test without authentication
  try {
    await axios.get(`${BASE_URL}/backlog/wotype-dept`);
    console.log('❌ Should have failed without auth');
  } catch (error) {
    console.log('✅ Correctly rejected request without auth:', error.response?.status);
  }

  // Test with invalid site number
  try {
    const response = await axios.get(`${BASE_URL}/backlog/wotype-dept`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: { siteNo: 'invalid' }
    });
    console.log('📊 Response with invalid site:', response.data);
  } catch (error) {
    console.log('✅ Handled invalid site number:', error.response?.status);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting WOType and Department Backlog Endpoint Tests');
  console.log('=' .repeat(80));
  
  await testWOTypeDeptEndpoint();
  await testDifferentSites();
  await testErrorHandling();
  
  console.log('\n\n🎉 All tests completed!');
  console.log('=' .repeat(80));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWOTypeDeptEndpoint,
  testDifferentSites,
  testErrorHandling,
  runAllTests
};
