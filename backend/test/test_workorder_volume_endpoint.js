#!/usr/bin/env node

/**
 * Test script for the new workorder-volume endpoint
 * Usage: node test_workorder_volume_endpoint.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const ENDPOINT = '/dashboard/workorder-volume';

// Test cases
const testCases = [
  {
    name: 'Get all work order volume statistics',
    params: {}
  },
  {
    name: 'Get statistics for specific company year',
    params: { companyYear: 2024 }
  },
  {
    name: 'Get statistics with multiple filters',
    params: { 
      companyYear: 2024, 
      woTypeNo: 1, 
      deptno: 2 
    }
  },
  {
    name: 'Get statistics for specific assignee',
    params: { assignee: 21 }
  },
  {
    name: 'Get statistics for specific production unit',
    params: { puno: 3 }
  }
];

async function testEndpoint() {
  console.log('🧪 Testing Work Order Volume Endpoint');
  console.log('=====================================\n');

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`🔗 URL: ${BASE_URL}${ENDPOINT}`);
    console.log(`📊 Params:`, testCase.params);
    
    try {
      const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {
        params: testCase.params,
        headers: {
          'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Replace with actual token
        }
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`📈 Data Summary:`);
      console.log(`   - Total Records: ${response.data.data.summary.totalRecords}`);
      console.log(`   - Total Work Orders: ${response.data.data.summary.totalWorkOrders}`);
      console.log(`   - Total With WR: ${response.data.data.summary.totalWithWR}`);
      console.log(`   - Total On Time: ${response.data.data.summary.totalOnTime}`);
      console.log(`   - Total Late: ${response.data.data.summary.totalLate}`);
      console.log(`   - Total Downtime: ${response.data.data.summary.totalDowntime}`);
      
      if (response.data.data.statistics.length > 0) {
        console.log(`📊 Sample Statistics (first record):`);
        const sample = response.data.data.statistics[0];
        console.log(`   - Company Year: ${sample.companyYear}`);
        console.log(`   - Period No: ${sample.periodNo}`);
        console.log(`   - WO Count: ${sample.woCount}`);
        console.log(`   - On-Time Rate: ${sample.onTimeRatePct}%`);
        console.log(`   - Downtime: ${sample.downtime} hours`);
      }
      
      console.log(`🔍 Available Filters:`);
      console.log(`   - Assignees: ${response.data.data.filters.assignees.length} options`);
      if (response.data.data.filters.assignees.length > 0) {
        console.log(`     Sample: ${response.data.data.filters.assignees.slice(0, 3).map(a => `${a.name} (ID: ${a.id})`).join(', ')}`);
      }
      console.log(`   - WO Types: ${response.data.data.filters.woTypes.length} options`);
      if (response.data.data.filters.woTypes.length > 0) {
        console.log(`     Sample: ${response.data.data.filters.woTypes.slice(0, 3).map(w => `${w.name} (${w.code})`).join(', ')}`);
      }
      console.log(`   - Departments: ${response.data.data.filters.departments.length} options`);
      if (response.data.data.filters.departments.length > 0) {
        console.log(`     Sample: ${response.data.data.filters.departments.slice(0, 3).map(d => `${d.name} (${d.code})`).join(', ')}`);
      }
      console.log(`   - Production Units: ${response.data.data.filters.productionUnits.length} options`);
      if (response.data.data.filters.productionUnits.length > 0) {
        console.log(`     Sample: ${response.data.data.filters.productionUnits.slice(0, 3).map(p => `${p.name} (ID: ${p.id})`).join(', ')}`);
      }
      console.log(`   - Company Years: ${response.data.data.filters.companyYears.length} options`);
      if (response.data.data.filters.companyYears.length > 0) {
        console.log(`     Available: ${response.data.data.filters.companyYears.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
  }
}

// Instructions
console.log('📝 Instructions:');
console.log('1. Make sure your backend server is running on port 3001');
console.log('2. Replace "YOUR_JWT_TOKEN_HERE" with a valid JWT token');
console.log('3. Run: node test_workorder_volume_endpoint.js');
console.log('\n');

// Run tests
testEndpoint().catch(console.error);
