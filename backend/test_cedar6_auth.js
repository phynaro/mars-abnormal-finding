const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testAuthSystem() {
  try {
    console.log('Testing Cedar6_Mars Authentication System...\n');

    // Test 1: Login with existing user
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'arriskit',
      password: '123456' // Password for arriskit user
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      console.log('User:', loginResponse.data.user.username);
      console.log('Group:', loginResponse.data.user.groupName);
      console.log('Person Code:', loginResponse.data.user.personCode);
      
      const token = loginResponse.data.token;
      
      // Test 2: Get user profile
      console.log('\n2. Testing get profile...');
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (profileResponse.data.success) {
        console.log('✅ Profile retrieved successfully');
        console.log('Full Name:', profileResponse.data.user.fullName);
        console.log('Email:', profileResponse.data.user.email);
        console.log('Department:', profileResponse.data.user.department);
      }

      // Test 3: Get user permissions
      console.log('\n3. Testing get permissions...');
      const permissionsResponse = await axios.get(`${API_BASE_URL}/auth/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (permissionsResponse.data.success) {
        console.log('✅ Permissions retrieved successfully');
        console.log('Group Privileges Count:', permissionsResponse.data.permissions.groupPrivileges.length);
        console.log('User Permissions Count:', permissionsResponse.data.permissions.userPermissions.length);
        
        // Show some sample permissions
        const samplePrivileges = permissionsResponse.data.permissions.groupPrivileges.slice(0, 5);
        console.log('Sample Group Privileges:');
        samplePrivileges.forEach(priv => {
          console.log(`  - ${priv.FormID}: View=${priv.HaveView}, Save=${priv.HaveSave}, Delete=${priv.HaveDelete}`);
        });
      }

      // Test 4: Check specific permission
      console.log('\n4. Testing check specific permission...');
      const checkPermissionResponse = await axios.post(`${API_BASE_URL}/auth/check-permission`, {
        formId: 'WO',
        action: 'view'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (checkPermissionResponse.data.success) {
        console.log('✅ Permission check successful');
        console.log(`Permission for WO (view): ${checkPermissionResponse.data.hasPermission}`);
      }

      // Test 5: Change password (this will fail with wrong current password, but tests the endpoint)
      console.log('\n5. Testing change password (with wrong current password)...');
      try {
        await axios.post(`${API_BASE_URL}/auth/change-password`, {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log('✅ Change password endpoint working (correctly rejected wrong password)');
        } else {
          console.log('❌ Change password test failed:', error.message);
        }
      }

    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testAuthSystem();
