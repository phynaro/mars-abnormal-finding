const axios = require('axios');

// Test script to verify Line Login integration
async function testLineLogin() {
  try {
    console.log('�� Testing Line Login Integration...\n');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test Line Login URL generation
    console.log('\n2. Testing Line Login URL generation...');
    const urlResponse = await axios.get('http://localhost:3001/api/auth/line/url');
    console.log('✅ Line Login URL generated:', urlResponse.data.lineLoginUrl);
    
    console.log('\n🎉 All tests passed! Line Login integration is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if server is running
testLineLogin();