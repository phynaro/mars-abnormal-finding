#!/usr/bin/env node

/**
 * Test script for LINE unlink feature
 * Tests the new endpoints: GET /users/profile/line-profile and DELETE /users/profile/line-account
 */

const API_BASE_URL = 'http://localhost:3001/api';

// Test configuration
const TEST_USER = {
  username: 'testuser',
  password: 'testpass'
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER)
    });

    const result = await response.json();
    
    if (result.success && result.token) {
      authToken = result.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testGetLineProfile() {
  console.log('\n📋 Testing GET /users/profile/line-profile...');
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile/line-profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Get LINE profile successful');
      console.log('   Profile data:', result.profile ? {
        displayName: result.profile.displayName,
        pictureUrl: result.profile.pictureUrl ? 'Present' : 'Not available',
        userId: result.profile.userId ? 'Present' : 'Not available'
      } : 'No profile data');
    } else {
      console.log('ℹ️  Get LINE profile response:', result.message);
      if (result.message === 'No LINE account linked') {
        console.log('   This is expected if no LINE account is linked');
      }
    }
  } catch (error) {
    console.log('❌ Get LINE profile error:', error.message);
  }
}

async function testUnlinkLineAccount() {
  console.log('\n🔗 Testing DELETE /users/profile/line-account...');
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile/line-account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Unlink LINE account successful');
      console.log('   Message:', result.message);
    } else {
      console.log('ℹ️  Unlink LINE account response:', result.message);
    }
  } catch (error) {
    console.log('❌ Unlink LINE account error:', error.message);
  }
}

async function testGetUserProfile() {
  console.log('\n👤 Testing GET /auth/profile (to check LINE ID status)...');
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Get user profile successful');
      console.log('   LINE ID status:', result.user.lineId ? 'Linked' : 'Not linked');
      if (result.user.lineId) {
        console.log('   LINE ID:', result.user.lineId.substring(0, 8) + '...');
      }
    } else {
      console.log('❌ Get user profile failed:', result.message);
    }
  } catch (error) {
    console.log('❌ Get user profile error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing LINE Unlink Feature');
  console.log('================================');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Test getting user profile to see current LINE ID status
  await testGetUserProfile();
  
  // Test getting LINE profile
  await testGetLineProfile();
  
  // Test unlinking LINE account
  await testUnlinkLineAccount();
  
  // Test getting user profile again to verify LINE ID was removed
  await testGetUserProfile();
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
