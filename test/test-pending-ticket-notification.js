/**
 * Test script for Pending Ticket Notification Service
 * Tests the notification service for pending tickets
 * 
 * Usage:
 * node test/test-pending-ticket-notification.js
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TEST_USER_ID = 1; // Change this to test with specific user

// You need to provide a valid JWT token
const AUTH_TOKEN = process.env.TEST_TOKEN || 'your-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testSingleUserNotification() {
  console.log('\n=== Test 1: Send notification to specific user ===');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/tickets/notifications/pending/${TEST_USER_ID}`,
      {},
      { headers }
    );
    
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testBatchNotification() {
  console.log('\n=== Test 2: Send notifications to all users ===');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/tickets/notifications/pending`,
      {},
      { headers }
    );
    
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testGetPendingTickets() {
  console.log('\n=== Test 3: Get pending tickets for user (from API) ===');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/tickets/pending/user?limit=10`,
      { headers }
    );
    
    console.log('✅ Success - Found tickets:', response.data.data?.tickets?.length || 0);
    
    // Filter only in_progress or escalated
    const pendingTickets = response.data.data?.tickets?.filter(
      t => ['in_progress', 'escalated'].includes(t.status)
    ) || [];
    
    console.log(`📊 Pending tickets (in_progress/escalated): ${pendingTickets.length}`);
    
    if (pendingTickets.length > 0) {
      console.log('\nFirst few pending tickets:');
      pendingTickets.slice(0, 3).forEach(ticket => {
        console.log(`  - ${ticket.ticket_number}: ${ticket.status}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Pending Ticket Notification Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  if (AUTH_TOKEN === 'your-jwt-token-here') {
    console.error('\n⚠️  Please set TEST_TOKEN environment variable or update AUTH_TOKEN in this file');
    console.log('   You can get a token by logging in through the app');
    return;
  }
  
  // Run tests
  await testGetPendingTickets();
  await testSingleUserNotification();
  await testBatchNotification();
  
  console.log('\n✅ All tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

