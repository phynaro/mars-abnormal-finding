#!/usr/bin/env node

/**
 * Test script for the current company year endpoint
 * Usage: node test_current_company_year.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const ENDPOINT = '/dashboard/current-company-year';

async function testCurrentCompanyYear() {
  console.log('🧪 Testing Current Company Year Endpoint');
  console.log('========================================\n');

  console.log(`🔗 URL: ${BASE_URL}${ENDPOINT}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Replace with actual token
      }
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📅 Current Company Year: ${response.data.data.currentCompanyYear}`);
    console.log(`📆 Today's Date: ${response.data.data.today}`);
    console.log(`⏰ Timestamp: ${response.data.data.timestamp}`);
    
    console.log(`\n📊 Full Response:`);
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Instructions
console.log('📝 Instructions:');
console.log('1. Make sure your backend server is running on port 3001');
console.log('2. Replace "YOUR_JWT_TOKEN_HERE" with a valid JWT token');
console.log('3. Run: node test_current_company_year.js');
console.log('\n');

// Run test
testCurrentCompanyYear().catch(console.error);
