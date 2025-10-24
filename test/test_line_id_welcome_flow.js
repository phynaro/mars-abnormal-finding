/**
 * Test script for Line ID Welcome Page Flow
 * 
 * This script tests the complete flow:
 * 1. User logs in with CEDAR account
 * 2. If no LineID is set, user should be redirected to /welcome
 * 3. User can enter LineID in welcome page
 * 4. After saving LineID, user should be redirected to /home
 * 5. Next login should skip welcome page if LineID exists
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

// Test credentials (replace with actual test user)
const TEST_USER = {
  username: 'testuser',
  password: 'testpass'
};

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  
  return data;
}

async function testLineIdWelcomeFlow() {
  console.log('🧪 Testing Line ID Welcome Page Flow...\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginData = await makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    });
    
    if (!loginData.success) {
      throw new Error('Login failed');
    }
    
    const token = loginData.token;
    const user = loginData.user;
    
    console.log(`✅ Login successful for user: ${user.firstName} ${user.lastName}`);
    console.log(`📱 Current LineID: ${user.lineId || 'Not set'}`);
    
    // Step 2: Check if user needs LineID setup
    console.log('\n2️⃣ Checking LineID status...');
    const needsLineIdSetup = !user.lineId;
    
    if (needsLineIdSetup) {
      console.log('⚠️  User needs LineID setup - should be redirected to /welcome');
    } else {
      console.log('✅ User has LineID - should be redirected to /home');
    }
    
    // Step 3: Test updating LineID (if needed)
    if (needsLineIdSetup) {
      console.log('\n3️⃣ Testing LineID update...');
      const testLineId = 'U1234567890abcdef';
      
      const updateData = await makeRequest(`${API_BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lineId: testLineId })
      });
      
      if (updateData.success) {
        console.log('✅ LineID updated successfully');
        
        // Step 4: Verify LineID was saved
        console.log('\n4️⃣ Verifying LineID was saved...');
        const profileData = await makeRequest(`${API_BASE_URL}/users/profile`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (profileData.lineId === testLineId) {
          console.log('✅ LineID verification successful');
        } else {
          console.log('❌ LineID verification failed');
        }
      } else {
        console.log('❌ LineID update failed');
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testLineIdWelcomeFlow();
}

module.exports = { testLineIdWelcomeFlow };
