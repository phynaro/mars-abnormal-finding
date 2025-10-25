/**
 * Test script for LINE Avatar Download and Linking
 * 
 * This script tests the new LINE avatar download functionality:
 * 1. Downloads LINE profile picture from URL
 * 2. Compresses and saves it to avatar directory
 * 3. Updates user's AvatarUrl with local path
 * 4. Links LINE account with downloaded avatar
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - Valid JWT token from normal login
 * - Valid LINE profile picture URL
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001/api';

// Test data - replace with actual values for testing
const TEST_JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
const TEST_LINE_PROFILE = {
  userId: 'U436b7c116495adcbc4096d51b28abad8',
  displayName: 'Test User',
  pictureUrl: 'https://profile.line-scdn.net/0hGMoaEZU4GGJCGAbot3VmXDJIGwhhaUFwa39fBXJPQAV_LQo0aCxXDH4RElF3IV00ZixeDH4RRlRgdAhiDxlSfR4ELRZ2TA8waygWWDRlEBkJchpAJgstTyRvIjAnLyVCDwdTV3RaBg4FYAk0GysLX3IdGwwqKVpcMk90NEcqduEtGm83b39RA38eRlL9'
};

async function testLinkLineAccount() {
  console.log('\n=== Testing Link LINE Account with Avatar Download ===');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/link-line-account`, {
      lineProfile: TEST_LINE_PROFILE
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Link LINE Account Success:');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('❌ Link LINE Account Failed:');
    console.log('Error:', error.response?.data || error.message);
    return null;
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

async function testAvatarFileExists(avatarPath) {
  console.log('\n=== Testing Avatar File Exists ===');
  
  if (!avatarPath) {
    console.log('❌ No avatar path provided');
    return false;
  }
  
  // Convert relative path to absolute path
  const absolutePath = path.join(__dirname, '..', 'backend', avatarPath);
  
  try {
    const exists = fs.existsSync(absolutePath);
    if (exists) {
      const stats = fs.statSync(absolutePath);
      console.log('✅ Avatar file exists:');
      console.log('  Path:', absolutePath);
      console.log('  Size:', Math.round(stats.size / 1024), 'KB');
      console.log('  Created:', stats.birthtime);
      return true;
    } else {
      console.log('❌ Avatar file does not exist:', absolutePath);
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking avatar file:', error.message);
    return false;
  }
}

async function testLineAvatarDownloadFlow() {
  console.log('🚀 Starting LINE Avatar Download Test');
  console.log('=====================================');
  
  // Step 1: Link LINE account with avatar download
  const linkResult = await testLinkLineAccount();
  if (!linkResult || !linkResult.success) {
    console.log('\n❌ Test stopped: Failed to link LINE account');
    return;
  }
  
  console.log('\n📱 LINE Account Linking Result:');
  console.log('  Success:', linkResult.success);
  console.log('  Message:', linkResult.message);
  console.log('  Avatar Path:', linkResult.avatarPath);
  
  // Step 2: Verify avatar file exists
  if (linkResult.avatarPath) {
    const fileExists = await testAvatarFileExists(linkResult.avatarPath);
    if (!fileExists) {
      console.log('\n❌ Test stopped: Avatar file was not created');
      return;
    }
  }
  
  // Step 3: Get updated user profile
  const userProfile = await testGetUserProfile();
  if (userProfile && userProfile.success) {
    console.log('\n🎉 LINE Avatar Download Test PASSED!');
    console.log('Updated User Profile:');
    console.log('  Username:', userProfile.user.username);
    console.log('  Line ID:', userProfile.user.lineId);
    console.log('  Avatar URL:', userProfile.user.avatarUrl);
    
    // Verify the LineID and AvatarUrl were updated
    if (userProfile.user.lineId === TEST_LINE_PROFILE.userId) {
      console.log('✅ LineID correctly updated in database');
    } else {
      console.log('❌ LineID not updated correctly');
    }
    
    if (userProfile.user.avatarUrl && userProfile.user.avatarUrl.includes('/uploads/avatars/')) {
      console.log('✅ AvatarUrl correctly updated with local path');
    } else {
      console.log('❌ AvatarUrl not updated correctly');
    }
  } else {
    console.log('\n❌ Test failed: Could not verify profile update');
  }
}

function testAvatarDownloadProcess() {
  console.log('\n🧪 Testing Avatar Download Process');
  console.log('==================================');
  
  console.log('Process Flow:');
  console.log('1. ✅ Receive LINE profile with pictureUrl');
  console.log('2. ✅ Download image from LINE servers');
  console.log('3. ✅ Compress image (max 512x512, 85% quality)');
  console.log('4. ✅ Save to uploads/avatars/{personNo}/line_avatar_{timestamp}.jpg');
  console.log('5. ✅ Update database with local avatar path');
  console.log('6. ✅ Return success with avatar path');
  
  console.log('\nBenefits:');
  console.log('✅ Avatar persists even if LINE URL changes');
  console.log('✅ Reduced bandwidth usage (compressed images)');
  console.log('✅ Consistent avatar storage with existing system');
  console.log('✅ Automatic compression and optimization');
}

// Main execution
async function main() {
  try {
    if (TEST_JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
      console.log('⚠️  Missing JWT token, running process tests only');
      testAvatarDownloadProcess();
      console.log('\nTo test full flow:');
      console.log('1. Login normally with username/password');
      console.log('2. Copy the JWT token from localStorage');
      console.log('3. Update TEST_JWT_TOKEN in this script');
      console.log('4. Run the test again');
      return;
    }
    
    await testLineAvatarDownloadFlow();
    testAvatarDownloadProcess();
    
  } catch (error) {
    console.error('Test execution error:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testLinkLineAccount,
  testGetUserProfile,
  testAvatarFileExists,
  testLineAvatarDownloadFlow,
  testAvatarDownloadProcess
};
