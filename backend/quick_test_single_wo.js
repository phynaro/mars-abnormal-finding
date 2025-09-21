#!/usr/bin/env node

/**
 * Quick Test Script: Get Single Work Order
 * Usage: node quick_test_single_wo.js [WORK_ORDER_ID]
 * Example: node quick_test_single_wo.js 201635
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'phynaro',
  password: 'Jir@202501'
};

// Get work order ID from command line argument or use default
const WORK_ORDER_ID = process.argv[2] || 201635;

// Helper function to make requests
async function makeRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data
  };
  
  const response = await axios(config);
  return response.data;
}

// Main test function
async function testSingleWorkOrder() {
  try {
    console.log('🚀 Quick Test: Single Work Order');
    console.log('=' * 40);
    console.log(`Work Order ID: ${WORK_ORDER_ID}`);
    console.log('');
    
    // Step 1: Authenticate
    console.log('🔐 Authenticating...');
    const authResponse = await makeRequest('POST', '/auth/login', TEST_USER);
    
    if (!authResponse.success || !authResponse.token) {
      throw new Error('Authentication failed');
    }
    
    const token = authResponse.token;
    console.log('✅ Authenticated successfully');
    console.log('');
    
    // Step 2: Get work order
    console.log(`📋 Fetching Work Order ${WORK_ORDER_ID}...`);
    const startTime = Date.now();
    const woResponse = await makeRequest('GET', `/workorders/${WORK_ORDER_ID}`, null, token);
    const endTime = Date.now();
    
    if (!woResponse.success) {
      throw new Error('Failed to retrieve work order');
    }
    
    const wo = woResponse.data;
    
    // Display results
    console.log('✅ Work Order retrieved successfully');
    console.log(`⏱️  Response time: ${endTime - startTime}ms`);
    console.log('');
    
    console.log('📊 Work Order Details:');
    console.log(`   ID: ${wo.id}`);
    console.log(`   Code: ${wo.woCode}`);
    console.log(`   Date: ${wo.date} ${wo.time}`);
    console.log(`   Status: ${wo.status?.name} (${wo.status?.code})`);
    console.log(`   Type: ${wo.type?.name} (${wo.type?.code})`);
    console.log(`   Priority: ${wo.priority?.name || 'Not set'}`);
    console.log(`   Requester: ${wo.requester?.name}`);
    console.log('');
    
    console.log('📝 Problem Description:');
    console.log(`   ${wo.problem}`);
    console.log('');
    
    if (wo.taskProcedure) {
      console.log('🔧 Task Procedure:');
      console.log(`   ${wo.taskProcedure}`);
      console.log('');
    }
    
    // Timing information
    console.log('⏰ Timing:');
    if (wo.actual?.startDate) {
      console.log(`   Started: ${wo.actual.startDate} ${wo.actual.startTime}`);
      console.log(`   Finished: ${wo.actual.finishDate} ${wo.actual.finishTime}`);
      console.log(`   Duration: ${wo.actual.duration} minutes`);
    } else {
      console.log(`   Status: Not started yet`);
    }
    console.log('');
    
    // Safety requirements
    const safety = wo.safety;
    const safetyReqs = [];
    if (safety?.hotWork) safetyReqs.push('Hot Work');
    if (safety?.confineSpace) safetyReqs.push('Confined Space');
    if (safety?.workAtHeight) safetyReqs.push('Work at Height');
    if (safety?.lockOutTagOut) safetyReqs.push('Lock Out Tag Out');
    
    console.log('🦺 Safety Requirements:');
    if (safetyReqs.length > 0) {
      safetyReqs.forEach(req => console.log(`   ⚠️  ${req}`));
    } else {
      console.log('   ✅ No special safety requirements');
    }
    console.log('');
    
    // Related records
    console.log('🔗 Related Records:');
    console.log(`   Work Request: ${wo.related?.wrCode || 'N/A'}`);
    console.log(`   Equipment: ${wo.equipment?.name || 'N/A'}`);
    console.log(`   Production Unit: ${wo.productionUnit?.name || 'N/A'}`);
    console.log(`   Department: ${wo.department?.name || 'N/A'}`);
    console.log('');
    
    // Data structure info
    console.log('📈 Data Structure:');
    console.log(`   Main fields: ${Object.keys(wo).length}`);
    console.log(`   Raw database fields: ${Object.keys(wo.allFields || {}).length}`);
    console.log(`   JSON size: ${(JSON.stringify(wo).length / 1024).toFixed(2)} KB`);
    console.log('');
    
    // Save to file
    const fs = require('fs');
    const filename = `single_wo_${WORK_ORDER_ID}_test.json`;
    fs.writeFileSync(filename, JSON.stringify(woResponse, null, 2));
    console.log(`💾 Full response saved to: ${filename}`);
    
    console.log('');
    console.log('✅ Test completed successfully!');
    
    return wo;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSingleWorkOrder();
}

module.exports = { testSingleWorkOrder };
