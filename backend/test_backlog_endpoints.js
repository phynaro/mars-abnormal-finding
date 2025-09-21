const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test configuration
const TEST_CONFIG = {
  siteNo: 3,
  deptCode: 'REL-PP',
  personName: 'Aree Tatongjai'
};

// Mock authentication token (you'll need to replace this with a real token)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjaGFueWthciIsInBlcnNvbk5vIjo1NDgsInVzZXJuYW1lIjoiY2hhbnlrYXIiLCJncm91cE5vIjoxMSwiZ3JvdXBDb2RlIjoiTVAiLCJncm91cE5hbWUiOiJBc3Npc3RhbmNlIEVuZ2luZWVyIC8gTWFpbnRlbmFuY2UgUGxhbm5lciIsImlhdCI6MTc1NzA0ODQzMSwiZXhwIjoxNzU3MTM0ODMxfQ.3_lOtdf5uYK-kIzWc50K8V2E09Tad6SwR8wX0fVmKKE';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testBacklogEndpoints() {
  console.log('🧪 Testing Backlog API Endpoints...\n');

  try {
    // Test 1: Get Backlog by Department
    console.log('1️⃣ Testing GET /api/backlog/assign');
    try {
      const response1 = await axios.get(`${API_BASE_URL}/backlog/assign`, {
        headers,
        params: { siteNo: TEST_CONFIG.siteNo }
      });
      console.log('✅ Success:', response1.data.success);
      console.log('📊 Data points:', response1.data.data.backlog.length);
      console.log('📈 Summary:', response1.data.data.summary);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get Backlog by Department - Level 1 Detail
    console.log('2️⃣ Testing GET /api/backlog/assign/lv1');
    try {
      const response2 = await axios.get(`${API_BASE_URL}/backlog/assign/lv1`, {
        headers,
        params: { 
          siteNo: TEST_CONFIG.siteNo,
          deptCode: TEST_CONFIG.deptCode
        }
      });
      console.log('✅ Success:', response2.data.success);
      console.log('📊 Detail records:', response2.data.data.details.length);
      console.log('📈 Summary:', response2.data.data.summary);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Get Backlog by User
    console.log('3️⃣ Testing GET /api/backlog/assignto');
    try {
      const response3 = await axios.get(`${API_BASE_URL}/backlog/assignto`, {
        headers,
        params: { siteNo: TEST_CONFIG.siteNo }
      });
      console.log('✅ Success:', response3.data.success);
      console.log('📊 Data points:', response3.data.data.backlog.length);
      console.log('📈 Summary:', response3.data.data.summary);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Get Backlog by User - Level 1 Detail
    console.log('4️⃣ Testing GET /api/backlog/assignto/lv1');
    try {
      const response4 = await axios.get(`${API_BASE_URL}/backlog/assignto/lv1`, {
        headers,
        params: { 
          siteNo: TEST_CONFIG.siteNo,
          personName: TEST_CONFIG.personName
        }
      });
      console.log('✅ Success:', response4.data.success);
      console.log('📊 Detail records:', response4.data.data.details.length);
      console.log('📈 Summary:', response4.data.data.summary);
    } catch (error) {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Test error handling - missing required parameter
    console.log('5️⃣ Testing Error Handling - Missing deptCode');
    try {
      const response5 = await axios.get(`${API_BASE_URL}/backlog/assign/lv1`, {
        headers,
        params: { siteNo: TEST_CONFIG.siteNo }
      });
      console.log('❌ Should have failed but got:', response5.data);
    } catch (error) {
      console.log('✅ Correctly caught error:', error.response?.data?.message);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  console.log('⚠️  Note: Make sure to update AUTH_TOKEN with a valid JWT token before running tests.');
  console.log('⚠️  Also ensure the backend server is running on port 3001.\n');
  
  testBacklogEndpoints();
}

module.exports = { testBacklogEndpoints };
