#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

async function testWorkflowTypes() {
  try {
    console.log('🧪 Testing WorkFlow Types API...\n');
    
    // Test GET /api/workflow/types
    console.log('1. Testing GET /api/workflow/types');
    const response = await axios.get(`${BASE_URL}/workflow/types`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
    // Test GET /api/workflow/types/:id (if we have data)
    if (response.data.data && response.data.data.length > 0) {
      const firstType = response.data.data[0];
      const typeId = firstType.WFTYPENO || firstType.id;
      
      console.log(`\n2. Testing GET /api/workflow/types/${typeId}`);
      const singleResponse = await axios.get(`${BASE_URL}/workflow/types/${typeId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Single Type Response Status:', singleResponse.status);
      console.log('✅ Single Type Response Data:', JSON.stringify(singleResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing WorkFlow Types API:', error.response?.data || error.message);
  }
}

// Run the test
testWorkflowTypes();
