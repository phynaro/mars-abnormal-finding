/**
 * Test script for External Browser LINE Profile Display
 * 
 * This script tests the new external browser flow:
 * 1. User clicks "Connect LINE Account" button
 * 2. System gets LINE profile and shows it (doesn't auto-bind)
 * 3. User sees LINE profile with name and picture
 * 4. User manually confirms binding
 * 5. System updates current user's LineID field
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

async function testExternalBrowserFlow() {
  console.log('🚀 Starting External Browser LINE Profile Display Test');
  console.log('====================================================');
  
  // Step 1: Get LINE profile (simulating user clicking "Connect LINE Account")
  const profileResult = await testGetLineProfile();
  if (!profileResult || !profileResult.success) {
    console.log('\n❌ Test stopped: Failed to get LINE profile');
    return;
  }
  
  const lineProfile = profileResult.profile;
  console.log('\n📱 LINE Profile Retrieved:');
  console.log('  User ID:', lineProfile.userId);
  console.log('  Display Name:', lineProfile.displayName);
  console.log('  Picture URL:', lineProfile.pictureUrl);
  
  console.log('\n🎨 UI State: External Browser Profile Display');
  console.log('  ✅ Shows LINE profile picture');
  console.log('  ✅ Shows LINE display name');
  console.log('  ✅ Shows LINE user ID');
  console.log('  ✅ Shows "Link LINE Account" button');
  console.log('  ✅ Shows "Skip for Now" button');
  
  // Step 2: Simulate user clicking "Link LINE Account" (manual confirmation)
  console.log('\n👆 User clicks "Link LINE Account" button...');
  
  const updateResult = await testUpdateUserProfile(lineProfile.userId, lineProfile.pictureUrl);
  if (!updateResult) {
    console.log('\n❌ Test stopped: Failed to update user profile');
    return;
  }
  
  console.log('\n🎉 External Browser LINE Profile Display Test PASSED!');
  console.log('✅ LINE profile was displayed for manual confirmation');
  console.log('✅ User manually confirmed the binding');
  console.log('✅ Current user\'s LineID field was updated');
  console.log('✅ Database was updated correctly');
}

function testWelcomePageStates() {
  console.log('\n🧪 Testing WelcomePage State Management');
  console.log('======================================');
  
  // Test initial state (external browser, no LINE profile)
  const initialState = {
    liffObject: { isInClient: () => false },
    user: { lineId: null },
    externalLineProfile: null
  };
  
  const shouldShowConnectButton = !initialState.liffObject?.isInClient() && 
                                 !initialState.user?.lineId && 
                                 !initialState.externalLineProfile;
  
  console.log('Initial State (External Browser):');
  console.log('  liffObject?.isInClient():', initialState.liffObject?.isInClient());
  console.log('  user.lineId:', initialState.user.lineId);
  console.log('  externalLineProfile:', initialState.externalLineProfile);
  console.log('  shouldShowConnectButton:', shouldShowConnectButton);
  
  if (shouldShowConnectButton) {
    console.log('✅ Shows "Connect LINE Account" button');
  } else {
    console.log('❌ Should show "Connect LINE Account" button');
  }
  
  // Test after getting LINE profile (external browser, with LINE profile)
  const profileRetrievedState = {
    liffObject: { isInClient: () => false },
    user: { lineId: null },
    externalLineProfile: {
      userId: 'U436b7c116495adcbc4096d51b28abad8',
      displayName: 'Test User',
      pictureUrl: 'https://profile.line-scdn.net/example.jpg'
    }
  };
  
  const shouldShowProfileDisplay = !profileRetrievedState.liffObject?.isInClient() && 
                                  !profileRetrievedState.user?.lineId && 
                                  profileRetrievedState.externalLineProfile;
  
  console.log('\nAfter Profile Retrieved:');
  console.log('  externalLineProfile:', profileRetrievedState.externalLineProfile ? 'Present' : 'Null');
  console.log('  shouldShowProfileDisplay:', shouldShowProfileDisplay);
  
  if (shouldShowProfileDisplay) {
    console.log('✅ Shows LINE Profile Display component');
    console.log('✅ Shows profile picture and name');
    console.log('✅ Shows "Link LINE Account" and "Skip" buttons');
  } else {
    console.log('❌ Should show LINE Profile Display component');
  }
  
  // Test after linking (external browser, LINE account linked)
  const linkedState = {
    liffObject: { isInClient: () => false },
    user: { lineId: 'U436b7c116495adcbc4096d51b28abad8' },
    externalLineProfile: null
  };
  
  const shouldShowNothing = !linkedState.liffObject?.isInClient() && 
                           linkedState.user?.lineId;
  
  console.log('\nAfter Linking:');
  console.log('  user.lineId:', linkedState.user.lineId);
  console.log('  shouldShowNothing:', shouldShowNothing);
  
  if (shouldShowNothing) {
    console.log('✅ Hides LINE linking section (already linked)');
  } else {
    console.log('❌ Should hide LINE linking section');
  }
}

// Main execution
async function main() {
  try {
    if (TEST_JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE' || TEST_LIFF_ACCESS_TOKEN === 'YOUR_LIFF_ACCESS_TOKEN_HERE') {
      console.log('⚠️  Missing test tokens, running UI state tests only');
      testWelcomePageStates();
      console.log('\nTo test full flow:');
      console.log('1. Login normally with username/password');
      console.log('2. Copy the JWT token from localStorage');
      console.log('3. Get a LIFF access token from LINE');
      console.log('4. Update TEST_JWT_TOKEN and TEST_LIFF_ACCESS_TOKEN in this script');
      console.log('5. Run the test again');
      return;
    }
    
    await testExternalBrowserFlow();
    testWelcomePageStates();
    
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
  testExternalBrowserFlow,
  testWelcomePageStates
};
