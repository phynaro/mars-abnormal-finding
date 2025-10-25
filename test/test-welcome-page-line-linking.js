/**
 * Test script for WelcomePage LINE Account Linking
 * 
 * This script tests the updated WelcomePage functionality:
 * 1. Shows LINE profile information when available
 * 2. Allows user to link their LINE account
 * 3. Updates LineID field in database
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - Valid JWT token from normal login
 * - LINE profile data available in AuthContext
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test data - replace with actual values for testing
const TEST_JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
const TEST_LINE_PROFILE = {
  userId: 'U436b7c116495adcbc4096d51b28abad8',
  displayName: 'Test User',
  pictureUrl: 'https://profile.line-scdn.net/example.jpg'
};

async function testUpdateUserProfile() {
  console.log('\n=== Testing Update User Profile with LINE Data ===');
  
  try {
    const response = await axios.put(`${API_BASE_URL}/users/profile`, {
      lineId: TEST_LINE_PROFILE.userId,
      avatarUrl: TEST_LINE_PROFILE.pictureUrl
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
  console.log('\n=== Testing Get User Profile ===');
  
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

async function testWelcomePageFlow() {
  console.log('🚀 Starting WelcomePage LINE Linking Test');
  console.log('==========================================');
  
  // Step 1: Get current user profile
  const profileResult = await testGetUserProfile();
  if (!profileResult || !profileResult.success) {
    console.log('\n❌ Test stopped: Failed to get user profile');
    return;
  }
  
  console.log('\nCurrent user LineID:', profileResult.user.lineId);
  
  // Step 2: Update profile with LINE data (simulating WelcomePage linking)
  const updateResult = await testUpdateUserProfile();
  if (!updateResult) {
    console.log('\n❌ Test stopped: Failed to update user profile');
    return;
  }
  
  // Step 3: Verify the update
  const updatedProfile = await testGetUserProfile();
  if (updatedProfile && updatedProfile.success) {
    console.log('\n🎉 WelcomePage LINE Linking Test PASSED!');
    console.log('Updated LineID:', updatedProfile.user.lineId);
    console.log('Updated AvatarUrl:', updatedProfile.user.avatarUrl);
  } else {
    console.log('\n❌ Test failed: Could not verify profile update');
  }
}

// Main execution
async function main() {
  try {
    if (TEST_JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
      console.log('⚠️  No JWT token provided, skipping test');
      console.log('To test:');
      console.log('1. Login normally with username/password');
      console.log('2. Copy the JWT token from localStorage');
      console.log('3. Update TEST_JWT_TOKEN in this script');
      console.log('4. Run the test again');
      return;
    }
    
    await testWelcomePageFlow();
    
  } catch (error) {
    console.error('Test execution error:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testUpdateUserProfile,
  testGetUserProfile,
  testWelcomePageFlow
};
