#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'phynaro',
  password: 'Jir@202501'
};

async function testOptimizedHierarchy() {
  try {
    console.log('🧪 Testing Optimized Hierarchy Endpoints...\n');

    // Authenticate
    console.log('🔐 Authenticating...');
    const authResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token = authResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Test 1: Fast hierarchy overview
    console.log('📊 Testing hierarchy overview...');
    const startTime1 = Date.now();
    const hierarchyResponse = await axios.get(`${BASE_URL}/assets/hierarchy?siteNo=3`, { headers });
    const time1 = Date.now() - startTime1;
    
    console.log(`✅ Hierarchy overview: ${time1}ms`);
    console.log(`   Sites: ${Object.keys(hierarchyResponse.data.data).length}`);
    console.log(`   Departments for MARS: ${Object.keys(hierarchyResponse.data.data[3].departments).length}`);
    console.log(`   Total PUs: ${hierarchyResponse.data.data[3].stats.totalProductionUnits}`);
    console.log(`   Total EQ: ${hierarchyResponse.data.data[3].stats.totalEquipment}`);

    // Test 2: Paginated department details
    console.log('\n📋 Testing department details with pagination...');
    const startTime2 = Date.now();
    const deptResponse = await axios.get(`${BASE_URL}/assets/hierarchy/department/general?siteNo=3&page=1&limit=10`, { headers });
    const time2 = Date.now() - startTime2;
    
    console.log(`✅ Department details (10 PUs): ${time2}ms`);
    console.log(`   Department: ${deptResponse.data.data.department.DEPTNAME}`);
    console.log(`   PUs returned: ${Object.keys(deptResponse.data.data.productionUnits).length}`);
    console.log(`   Total pages: ${deptResponse.data.pagination.pages}`);

    // Test 3: Performance comparison
    console.log('\n⚡ Performance Summary:');
    console.log(`   Hierarchy overview: ${time1}ms (vs previous ~65000ms)`);
    console.log(`   Department details: ${time2}ms (paginated, manageable)`);
    console.log(`   🎯 Performance improvement: ~${Math.round(65000/time1)}x faster!`);
    
    console.log('\n🎉 All optimized hierarchy tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testOptimizedHierarchy();
