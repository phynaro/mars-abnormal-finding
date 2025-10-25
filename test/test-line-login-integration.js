/**
 * Test script for LINE Login Integration
 * 
 * This script tests the complete LINE login flow:
 * 1. Verify LIFF token
 * 2. Get LINE profile
 * 3. Attempt LINE login with profile data
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - Valid LIFF access token
 * - User account with LineID linked in database
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test data - replace with actual values for testing
const TEST_ACCESS_TOKEN = 'YOUR_LIFF_ACCESS_TOKEN_HERE';
const TEST_LINE_PROFILE = {
  userId: 'U436b7c116495adcbc4096d51b28abad8', // Replace with actual LINE user ID
  displayName: 'Test User',
  pictureUrl: 'https://profile.line-scdn.net/example.jpg'
};

async function testLiffTokenVerification() {
  console.log('\n=== Testing LIFF Token Verification ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/verify-liff-token`, {
      accessToken: TEST_ACCESS_TOKEN
    });
    
    console.log('✅ LIFF Token Verification Success:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data.success;
  } catch (error) {
    console.log('❌ LIFF Token Verification Failed:');
    console.log('Error:', error.response?.data || error.message);
    return false;
  }
}

async function testGetLineProfile() {
  console.log('\n=== Testing Get LINE Profile ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/get-line-profile`, {
      accessToken: TEST_ACCESS_TOKEN
    });
    
    console.log('✅ Get LINE Profile Success:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Get LINE Profile Failed:');
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

async function testLineLogin(lineProfile) {
  console.log('\n=== Testing LINE Login ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/line-login`, {
      lineProfile: lineProfile
    });
    
    console.log('✅ LINE Login Success:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ LINE Login Failed:');
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

async function testCompleteFlow() {
  console.log('🚀 Starting LINE Login Integration Test');
  console.log('=====================================');
  
  // Step 1: Verify LIFF Token
  const tokenVerified = await testLiffTokenVerification();
  if (!tokenVerified) {
    console.log('\n❌ Test stopped: LIFF token verification failed');
    return;
  }
  
  // Step 2: Get LINE Profile
  const profileResult = await testGetLineProfile();
  if (!profileResult || !profileResult.success) {
    console.log('\n❌ Test stopped: Failed to get LINE profile');
    return;
  }
  
  // Step 3: Test LINE Login with actual profile data
  const loginResult = await testLineLogin(profileResult.profile);
  if (!loginResult || !loginResult.success) {
    console.log('\n❌ Test stopped: LINE login failed');
    return;
  }
  
  console.log('\n🎉 Complete LINE Login Flow Test PASSED!');
  console.log('User authenticated:', loginResult.user.username);
  console.log('JWT Token received:', loginResult.token ? 'Yes' : 'No');
}

async function testWithMockData() {
  console.log('\n=== Testing with Mock Data ===');
  console.log('Note: This test uses mock LINE profile data');
  
  const mockProfile = TEST_LINE_PROFILE;
  const loginResult = await testLineLogin(mockProfile);
  
  if (loginResult && loginResult.success) {
    console.log('\n🎉 Mock Data Test PASSED!');
    console.log('User authenticated:', loginResult.user.username);
  } else {
    console.log('\n❌ Mock Data Test FAILED');
    console.log('This might be expected if the LINE ID is not linked to any user account');
  }
}

// Main execution
async function main() {
  try {
    // Test with actual LIFF token (if provided)
    if (TEST_ACCESS_TOKEN !== 'YOUR_LIFF_ACCESS_TOKEN_HERE') {
      await testCompleteFlow();
    } else {
      console.log('⚠️  No LIFF access token provided, skipping token verification test');
    }
    
    // Test with mock data
    await testWithMockData();
    
  } catch (error) {
    console.error('Test execution error:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testLiffTokenVerification,
  testGetLineProfile,
  testLineLogin,
  testCompleteFlow,
  testWithMockData
};
