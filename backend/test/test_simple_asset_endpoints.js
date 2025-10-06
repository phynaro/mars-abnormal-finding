const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'phynaro',
  password: 'Jir@202501'
};

let authToken = null;

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      data
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error ${method} ${endpoint}:`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received - server may be down');
    } else {
      console.error('Request setup error:', error.message);
    }
    throw error;
  }
}

// Test authentication
async function testAuth() {
  console.log('🔐 Testing Authentication...');
  try {
    const response = await makeRequest('POST', '/auth/login', TEST_USER);
    if (response.success && response.token) {
      authToken = response.token;
      console.log('✅ Authentication successful');
      console.log('User:', response.user.firstName, response.user.lastName);
      console.log('Role:', response.user.role);
      return true;
    }
    throw new Error('Authentication failed - no token received');
  } catch (error) {
    console.error('❌ Authentication failed');
    return false;
  }
}

// Test health endpoint
async function testHealth() {
  console.log('\n❤️ Testing Health Endpoint...');
  try {
    const response = await makeRequest('GET', '/health');
    console.log('✅ Health check:', response.message);
    return true;
  } catch (error) {
    console.error('❌ Health check failed');
    return false;
  }
}

// Test asset endpoints with detailed error reporting
async function testAssetEndpoints() {
  console.log('\n📊 Testing Asset Endpoints...');
  
  const endpoints = [
    { name: 'Sites', path: '/assets/sites' },
    { name: 'Lookup Data', path: '/assets/lookup' },
    { name: 'Statistics', path: '/assets/statistics?siteNo=3' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint.name}...`);
      const response = await makeRequest('GET', endpoint.path);
      console.log(`✅ ${endpoint.name}: Success`);
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          console.log(`   Data: ${response.data.length} items`);
        } else if (typeof response.data === 'object') {
          console.log(`   Data: Object with keys:`, Object.keys(response.data));
        }
      }
      
      if (response.count !== undefined) {
        console.log(`   Count: ${response.count}`);
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint.name}: Failed`);
    }
  }
}

// Main test runner
async function runSimpleTests() {
  console.log('🧪 Starting Simple Asset Management API Tests...\n');
  
  // Test basic connectivity
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('\n❌ Cannot proceed - server health check failed');
    return;
  }
  
  // Test authentication
  const authOk = await testAuth();
  if (!authOk) {
    console.log('\n❌ Cannot proceed - authentication failed');
    return;
  }
  
  // Test asset endpoints
  await testAssetEndpoints();
  
  console.log('\n✅ Simple Asset Management API Tests Finished!');
}

// Run the tests
if (require.main === module) {
  runSimpleTests().catch(console.error);
}

module.exports = { runSimpleTests };
