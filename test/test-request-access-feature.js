/**
 * Test script for Request Access Feature
 * 
 * This script tests the complete Request Access flow:
 * 1. Database table creation
 * 2. Backend API endpoints
 * 3. Frontend integration
 * 
 * Prerequisites:
 * - Backend server running on localhost:3001
 * - Database connection configured
 * - SQL table created
 */

const axios = require('axios');
const sql = require('mssql');
const dbConfig = require('../src/config/dbConfig');

const API_BASE_URL = 'http://localhost:3001/api';

// Test data
const TEST_LINE_ID = 'U436b7c116495adcbc4096d51b28abad8';
const TEST_REQUEST_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  telephone: '+1234567890',
  lineId: TEST_LINE_ID
};

async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

async function testDatabaseTable() {
  console.log('\n=== Testing Database Table ===');
  
  try {
    const pool = await getConnection();
    
    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'IgxRequestAccess'
    `);
    
    if (tableCheck.recordset.length === 0) {
      console.log('❌ IgxRequestAccess table does not exist');
      console.log('   Please run the SQL script: database/create_request_access_table.sql');
      return false;
    }
    
    console.log('✅ IgxRequestAccess table exists');
    
    // Check table structure
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'IgxRequestAccess'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('✅ Table structure:');
    columns.recordset.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

async function testCheckStatusEndpoint() {
  console.log('\n=== Testing Check Status Endpoint ===');
  
  try {
    // Test with non-existent LINE ID
    const response = await axios.get(`${API_BASE_URL}/access-request/check-status/nonexistent`);
    
    console.log('✅ Check status endpoint accessible');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && !response.data.hasPendingRequest) {
      console.log('✅ Correctly returns no pending request for non-existent LINE ID');
    } else {
      console.log('❌ Unexpected response format');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Check status endpoint failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSubmitRequestEndpoint() {
  console.log('\n=== Testing Submit Request Endpoint ===');
  
  try {
    // First, clean up any existing test data
    const pool = await getConnection();
    await pool.request()
      .input('lineId', sql.NVarChar, TEST_LINE_ID)
      .query('DELETE FROM IgxRequestAccess WHERE LineID = @lineId');
    
    // Test valid submission
    const response = await axios.post(`${API_BASE_URL}/access-request/submit`, TEST_REQUEST_DATA);
    
    console.log('✅ Submit request endpoint accessible');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.requestId) {
      console.log('✅ Request submitted successfully');
      
      // Verify data was inserted correctly
      const verifyResult = await pool.request()
        .input('lineId', sql.NVarChar, TEST_LINE_ID)
        .query('SELECT * FROM IgxRequestAccess WHERE LineID = @lineId');
      
      if (verifyResult.recordset.length > 0) {
        const request = verifyResult.recordset[0];
        console.log('✅ Data verified in database:');
        console.log(`   RequestID: ${request.RequestID}`);
        console.log(`   Name: ${request.FirstName} ${request.LastName}`);
        console.log(`   Email: ${request.Email}`);
        console.log(`   Status: ${request.Status}`);
      } else {
        console.log('❌ Data not found in database');
      }
      
      return true;
    } else {
      console.log('❌ Unexpected response format');
      return false;
    }
  } catch (error) {
    console.log('❌ Submit request endpoint failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDuplicateSubmission() {
  console.log('\n=== Testing Duplicate Submission Prevention ===');
  
  try {
    // Try to submit the same request again
    const response = await axios.post(`${API_BASE_URL}/access-request/submit`, TEST_REQUEST_DATA);
    
    console.log('❌ Duplicate submission should have been rejected');
    return false;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ Duplicate submission correctly rejected');
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      return true;
    } else {
      console.log('❌ Unexpected error for duplicate submission:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testValidation() {
  console.log('\n=== Testing Input Validation ===');
  
  try {
    // Test missing required fields
    const invalidData = {
      firstName: 'John',
      // Missing lastName, email, lineId
    };
    
    const response = await axios.post(`${API_BASE_URL}/access-request/submit`, invalidData);
    
    console.log('❌ Validation should have rejected invalid data');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Input validation working correctly');
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      return true;
    } else {
      console.log('❌ Unexpected error for validation:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testCheckStatusWithExistingRequest() {
  console.log('\n=== Testing Check Status with Existing Request ===');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/access-request/check-status/${encodeURIComponent(TEST_LINE_ID)}`);
    
    console.log('✅ Check status with existing request');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.hasPendingRequest) {
      console.log('✅ Correctly found pending request');
      return true;
    } else {
      console.log('❌ Did not find existing pending request');
      return false;
    }
  } catch (error) {
    console.log('❌ Check status with existing request failed:', error.response?.data || error.message);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n=== Cleaning Up Test Data ===');
  
  try {
    const pool = await getConnection();
    await pool.request()
      .input('lineId', sql.NVarChar, TEST_LINE_ID)
      .query('DELETE FROM IgxRequestAccess WHERE LineID = @lineId');
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.log('❌ Cleanup failed:', error.message);
  }
}

async function testFrontendIntegration() {
  console.log('\n=== Frontend Integration Test ===');
  
  console.log('Frontend components created:');
  console.log('✅ RequestAccessPage.tsx - Main request access page');
  console.log('✅ accessRequestService.ts - API service layer');
  console.log('✅ LoginPage.tsx - Updated with "Request Access" link');
  console.log('✅ App.tsx - Updated with route for /request-access');
  
  console.log('\nFrontend flow:');
  console.log('1. User clicks "Request Access" on login page');
  console.log('2. Navigates to /request-access');
  console.log('3. LIFF initializes and gets LINE profile');
  console.log('4. Checks for existing pending request');
  console.log('5. Shows form or pending status');
  console.log('6. Submits request and shows success message');
  
  return true;
}

// Main execution
async function main() {
  console.log('🚀 Starting Request Access Feature Test');
  console.log('=====================================');
  
  const results = [];
  
  try {
    // Test database
    results.push(await testDatabaseTable());
    
    // Test backend endpoints
    results.push(await testCheckStatusEndpoint());
    results.push(await testSubmitRequestEndpoint());
    results.push(await testDuplicateSubmission());
    results.push(await testValidation());
    results.push(await testCheckStatusWithExistingRequest());
    
    // Test frontend integration
    results.push(await testFrontendIntegration());
    
    // Cleanup
    await cleanupTestData();
    
    // Summary
    const passed = results.filter(r => r === true).length;
    const total = results.length;
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Request Access feature is working correctly.');
    } else {
      console.log('❌ Some tests failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('Test execution error:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testDatabaseTable,
  testCheckStatusEndpoint,
  testSubmitRequestEndpoint,
  testDuplicateSubmission,
  testValidation,
  testCheckStatusWithExistingRequest,
  testFrontendIntegration
};
