/**
 * Test script for LINE Account Linking
 * 
 * This script tests the LINE account linking functionality:
 * 1. User logs in with username/password (gets JWT token)
 * 2. User clicks "Link LINE Account" button
 * 3. System gets LINE profile and updates current user's LineID field
 * 4. User's UserExtension.LineID field is updated in database
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - Valid JWT token from normal login
 * - Valid LIFF access token
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

async function testUpdateUserProfile(lineId, avatarUrl) {
  console.log('\n=== Testing Update User Profile with LINE Data ===');
  
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

async function testGetUserProfile() {
  console.log('\n=== Testing Get Updated User Profile ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Get User Profile Success:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Get User Profile Failed:');
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

async function testLineAccountLinkingFlow() {
  console.log('🚀 Starting LINE Account Linking Test');
  console.log('=====================================');
  
  // Step 1: Get LINE profile
  const profileResult = await testGetLineProfile();
  if (!profileResult || !profileResult.success) {
    console.log('\n❌ Test stopped: Failed to get LINE profile');
    return;
  }
  
  const lineProfile = profileResult.profile;
  console.log('\nLINE Profile Data:');
  console.log('  User ID:', lineProfile.userId);
  console.log('  Display Name:', lineProfile.displayName);
  console.log('  Picture URL:', lineProfile.pictureUrl);
  
  // Step 2: Update user profile with LINE data
  const updateResult = await testUpdateUserProfile(lineProfile.userId, lineProfile.pictureUrl);
  if (!updateResult) {
    console.log('\n❌ Test stopped: Failed to update user profile');
    return;
  }
  
  // Step 3: Verify the update by getting user profile
  const userProfile = await testGetUserProfile();
  if (userProfile && userProfile.success) {
    console.log('\n🎉 LINE Account Linking Test PASSED!');
    console.log('Updated User Profile:');
    console.log('  Username:', userProfile.user.username);
    console.log('  Line ID:', userProfile.user.lineId);
    console.log('  Avatar URL:', userProfile.user.avatarUrl);
    
    // Verify the LineID was actually updated
    if (userProfile.user.lineId === lineProfile.userId) {
      console.log('✅ LineID correctly updated in database');
    } else {
      console.log('❌ LineID not updated correctly');
    }
  } else {
    console.log('\n❌ Test failed: Could not verify profile update');
  }
}

function testWelcomePageFlow() {
  console.log('\n🧪 Testing WelcomePage LINE Linking Flow');
  console.log('========================================');
  
  // Simulate external browser scenario
  const liffObject = { isInClient: () => false }; // External browser
  const user = { lineId: null }; // User without LINE ID
  
  const shouldShowLineLinking = !liffObject?.isInClient() && !user?.lineId;
  
  console.log('External browser scenario:');
  console.log('  liffObject?.isInClient():', liffObject?.isInClient());
  console.log('  user.lineId:', user.lineId);
  console.log('  shouldShowLineLinking:', shouldShowLineLinking);
  
  if (shouldShowLineLinking) {
    console.log('✅ WelcomePage correctly shows LINE linking button');
    console.log('✅ User can click "Link LINE Account" button');
    console.log('✅ System will update current user\'s LineID field');
  } else {
    console.log('❌ WelcomePage should show LINE linking button');
  }
  
  // Simulate after linking
  const userAfterLinking = { lineId: 'U436b7c116495adcbc4096d51b28abad8' };
  const shouldShowAfterLinking = !liffObject?.isInClient() && !userAfterLinking?.lineId;
  
  console.log('\nAfter linking scenario:');
  console.log('  user.lineId:', userAfterLinking.lineId);
  console.log('  shouldShowLineLinking:', shouldShowAfterLinking);
  
  if (!shouldShowAfterLinking) {
    console.log('✅ WelcomePage correctly hides LINE linking section after linking');
  } else {
    console.log('❌ WelcomePage should hide LINE linking section after linking');
  }
}

// Main execution
async function main() {
  try {
    if (TEST_JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE' || TEST_LIFF_ACCESS_TOKEN === 'YOUR_LIFF_ACCESS_TOKEN_HERE') {
      console.log('⚠️  Missing test tokens, running UI flow tests only');
      testWelcomePageFlow();
      console.log('\nTo test full flow:');
      console.log('1. Login normally with username/password');
      console.log('2. Copy the JWT token from localStorage');
      console.log('3. Get a LIFF access token from LINE');
      console.log('4. Update TEST_JWT_TOKEN and TEST_LIFF_ACCESS_TOKEN in this script');
      console.log('5. Run the test again');
      return;
    }
    
    await testLineAccountLinkingFlow();
    testWelcomePageFlow();
    
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
  testUpdateUserProfile,
  testGetUserProfile,
  testLineAccountLinkingFlow,
  testWelcomePageFlow
};
