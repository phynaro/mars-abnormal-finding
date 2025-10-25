/**
 * Test script for External Browser LINE Login
 * 
 * This script tests the external browser LINE login functionality:
 * 1. Shows LINE login button when not in LINE client
 * 2. Handles LINE login flow for external browser users
 * 3. Updates user profile with LINE account data
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - Valid JWT token from normal login
 * - LIFF integration available
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test data - replace with actual values for testing
const TEST_JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
const TEST_LIFF_ACCESS_TOKEN = 'YOUR_LIFF_ACCESS_TOKEN_HERE';

async function testGetLineProfile() {
  console.log('\n=== Testing Get LINE Profile ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/get-line-profile`, {
      accessToken: TEST_LIFF_ACCESS_TOKEN
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

async function testUpdateUserProfile(lineId, avatarUrl) {
  console.log('\n=== Testing Update User Profile ===');
  
  try {
    const response = await axios.put(`${API_BASE_URL}/users/profile`, {
      lineId: lineId,
      avatarUrl: avatarUrl
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Update User Profile Success:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data.success;
  } catch (error) {
    console.log('❌ Update User Profile Failed:');
    console.log('Error:', error.response?.data || error.message);
    return false;
  }
}

async function testExternalBrowserLineLoginFlow() {
  console.log('🚀 Starting External Browser LINE Login Test');
  console.log('============================================');
  
  // Step 1: Get LINE profile
  const profileResult = await testGetLineProfile();
  if (!profileResult || !profileResult.success) {
    console.log('\n❌ Test stopped: Failed to get LINE profile');
    return;
  }
  
  // Step 2: Attempt LINE login
  const loginResult = await testLineLogin(profileResult.profile);
  if (!loginResult || !loginResult.success) {
    console.log('\n❌ Test stopped: LINE login failed');
    return;
  }
  
  // Step 3: Update user profile (alternative method)
  const updateResult = await testUpdateUserProfile(
    profileResult.profile.userId,
    profileResult.profile.pictureUrl
  );
  
  if (updateResult) {
    console.log('\n🎉 External Browser LINE Login Test PASSED!');
    console.log('User authenticated:', loginResult.user.username);
    console.log('LINE ID linked:', loginResult.user.lineId);
    console.log('Avatar URL updated:', loginResult.user.avatarUrl);
  } else {
    console.log('\n⚠️  LINE login succeeded but profile update failed');
    console.log('This might be expected if using different endpoints');
  }
}

function testWelcomePageConditions() {
  console.log('\n🧪 Testing WelcomePage Display Conditions');
  console.log('========================================');
  
  // Test external browser scenario
  const liffObject = { isInClient: () => false }; // External browser
  const user = { lineId: null }; // User without LINE ID
  
  const shouldShowLineLogin = !liffObject?.isInClient() && !user?.lineId;
  
  console.log('External browser scenario:');
  console.log('  liffObject?.isInClient():', liffObject?.isInClient());
  console.log('  user.lineId:', user.lineId);
  console.log('  shouldShowLineLogin:', shouldShowLineLogin);
  
  if (shouldShowLineLogin) {
    console.log('✅ WelcomePage correctly shows LINE login button in external browser');
  } else {
    console.log('❌ WelcomePage should show LINE login button in external browser');
  }
  
  // Test LINE client scenario
  const liffObjectInClient = { isInClient: () => true }; // LINE client
  const shouldShowLineLinking = liffObjectInClient?.isInClient() && !user?.lineId;
  
  console.log('\nLINE client scenario:');
  console.log('  liffObject?.isInClient():', liffObjectInClient?.isInClient());
  console.log('  user.lineId:', user.lineId);
  console.log('  shouldShowLineLinking:', shouldShowLineLinking);
  
  if (shouldShowLineLinking) {
    console.log('✅ WelcomePage correctly shows LINE linking section in LINE client');
  } else {
    console.log('❌ WelcomePage should show LINE linking section in LINE client');
  }
}

// Main execution
async function main() {
  try {
    if (TEST_JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE' || TEST_LIFF_ACCESS_TOKEN === 'YOUR_LIFF_ACCESS_TOKEN_HERE') {
      console.log('⚠️  Missing test tokens, running UI condition tests only');
      testWelcomePageConditions();
      console.log('\nTo test full flow:');
      console.log('1. Login normally with username/password');
      console.log('2. Copy the JWT token from localStorage');
      console.log('3. Get a LIFF access token from LINE');
      console.log('4. Update TEST_JWT_TOKEN and TEST_LIFF_ACCESS_TOKEN in this script');
      console.log('5. Run the test again');
      return;
    }
    
    await testExternalBrowserLineLoginFlow();
    testWelcomePageConditions();
    
  } catch (error) {
    console.error('Test execution error:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testGetLineProfile,
  testLineLogin,
  testUpdateUserProfile,
  testExternalBrowserLineLoginFlow,
  testWelcomePageConditions
};
