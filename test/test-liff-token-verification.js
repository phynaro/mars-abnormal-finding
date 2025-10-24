const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api/auth';
const TEST_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.UnQ_o-GP0VtnwDjbK0C8E_NvK...'; // Replace with actual token

async function testLiffTokenVerification() {
  console.log('Testing LIFF Token Verification Endpoint');
  console.log('=====================================');
  
  try {
    // Test 1: Verify LIFF token
    console.log('\n1. Testing LIFF token verification...');
    const response = await axios.post(`${BASE_URL}/verify-liff-token`, {
      accessToken: TEST_ACCESS_TOKEN
    });
    
    console.log('✅ Success Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error Response:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
  
  try {
    // Test 2: Test with missing access token
    console.log('\n2. Testing with missing access token...');
    const response = await axios.post(`${BASE_URL}/verify-liff-token`, {});
    
    console.log('✅ Success Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error Response:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
  
  try {
    // Test 3: Test with invalid access token
    console.log('\n3. Testing with invalid access token...');
    const response = await axios.post(`${BASE_URL}/verify-liff-token`, {
      accessToken: 'invalid_token_123'
    });
    
    console.log('✅ Success Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error Response:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

// Run the test
testLiffTokenVerification()
  .then(() => {
    console.log('\n=====================================');
    console.log('Test completed!');
  })
  .catch((error) => {
    console.error('Test failed:', error.message);
  });
