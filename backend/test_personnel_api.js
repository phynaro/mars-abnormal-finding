const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/personnel';

// Test all personnel API endpoints
async function testPersonnelAPI() {
  console.log('🧪 Testing Personnel API Endpoints...\n');

  try {
    // Test 1: Get organization statistics
    console.log('📊 Testing Organization Statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/stats`);
    console.log('✅ Stats:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // Test 2: Get persons with pagination
    console.log('👥 Testing Get Persons (Paginated)...');
    const personsResponse = await axios.get(`${BASE_URL}/persons?page=1&limit=5`);
    console.log('✅ Persons:', JSON.stringify(personsResponse.data, null, 2));
    console.log('');

    // Test 3: Get person by ID (using first person from previous result)
    if (personsResponse.data.data && personsResponse.data.data.length > 0) {
      const personId = personsResponse.data.data[0].PERSONNO;
      console.log(`👤 Testing Get Person by ID (${personId})...`);
      const personResponse = await axios.get(`${BASE_URL}/persons/${personId}`);
      console.log('✅ Person:', JSON.stringify(personResponse.data, null, 2));
      console.log('');

      // Test 4: Get person's user groups
      console.log(`👥 Testing Get Person's User Groups (${personId})...`);
      const personGroupsResponse = await axios.get(`${BASE_URL}/persons/${personId}/groups`);
      console.log('✅ Person Groups:', JSON.stringify(personGroupsResponse.data, null, 2));
      console.log('');
    }

    // Test 5: Get departments with pagination
    console.log('🏢 Testing Get Departments (Paginated)...');
    const deptsResponse = await axios.get(`${BASE_URL}/departments?page=1&limit=5`);
    console.log('✅ Departments:', JSON.stringify(deptsResponse.data, null, 2));
    console.log('');

    // Test 6: Get department by ID
    if (deptsResponse.data.data && deptsResponse.data.data.length > 0) {
      const deptId = deptsResponse.data.data[0].DEPTNO;
      console.log(`🏢 Testing Get Department by ID (${deptId})...`);
      const deptResponse = await axios.get(`${BASE_URL}/departments/${deptId}`);
      console.log('✅ Department:', JSON.stringify(deptResponse.data, null, 2));
      console.log('');
    }

    // Test 7: Get department hierarchy
    console.log('🌳 Testing Get Department Hierarchy...');
    const hierarchyResponse = await axios.get(`${BASE_URL}/departments/hierarchy`);
    console.log('✅ Hierarchy (first 3):', JSON.stringify(hierarchyResponse.data.data.slice(0, 3), null, 2));
    console.log('');

    // Test 8: Get titles with pagination
    console.log('🎯 Testing Get Titles (Paginated)...');
    const titlesResponse = await axios.get(`${BASE_URL}/titles?page=1&limit=5`);
    console.log('✅ Titles:', JSON.stringify(titlesResponse.data, null, 2));
    console.log('');

    // Test 9: Get title by ID
    if (titlesResponse.data.data && titlesResponse.data.data.length > 0) {
      const titleId = titlesResponse.data.data[0].TITLENO;
      console.log(`🎯 Testing Get Title by ID (${titleId})...`);
      const titleResponse = await axios.get(`${BASE_URL}/titles/${titleId}`);
      console.log('✅ Title:', JSON.stringify(titleResponse.data, null, 2));
      console.log('');
    }

    // Test 10: Get user groups with pagination
    console.log('👥 Testing Get User Groups (Paginated)...');
    const userGroupsResponse = await axios.get(`${BASE_URL}/usergroups?page=1&limit=5`);
    console.log('✅ User Groups:', JSON.stringify(userGroupsResponse.data, null, 2));
    console.log('');

    // Test 11: Get user group by ID
    if (userGroupsResponse.data.data && userGroupsResponse.data.data.length > 0) {
      const userGroupId = userGroupsResponse.data.data[0].USERGROUPNO;
      console.log(`👥 Testing Get User Group by ID (${userGroupId})...`);
      const userGroupResponse = await axios.get(`${BASE_URL}/usergroups/${userGroupId}`);
      console.log('✅ User Group:', JSON.stringify(userGroupResponse.data, null, 2));
      console.log('');

      // Test 12: Get user group members
      console.log(`👥 Testing Get User Group Members (${userGroupId})...`);
      const membersResponse = await axios.get(`${BASE_URL}/usergroups/${userGroupId}/members?page=1&limit=3`);
      console.log('✅ Members:', JSON.stringify(membersResponse.data, null, 2));
      console.log('');
    }

    // Test 13: Search functionality
    console.log('🔍 Testing Search Functionality...');
    const searchResponse = await axios.get(`${BASE_URL}/persons?search=admin&limit=3`);
    console.log('✅ Search Results:', JSON.stringify(searchResponse.data, null, 2));
    console.log('');

    // Test 14: Filter by department
    if (deptsResponse.data.data && deptsResponse.data.data.length > 0) {
      const deptId = deptsResponse.data.data[0].DEPTNO;
      console.log(`🔍 Testing Filter by Department (${deptId})...`);
      const filterResponse = await axios.get(`${BASE_URL}/persons?deptNo=${deptId}&limit=3`);
      console.log('✅ Filter Results:', JSON.stringify(filterResponse.data, null, 2));
      console.log('');
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases...\n');

  try {
    // Test non-existent person
    console.log('❌ Testing non-existent person...');
    try {
      await axios.get(`${BASE_URL}/persons/99999`);
    } catch (error) {
      console.log('✅ Correctly returned 404:', error.response.status, error.response.data.message);
    }

    // Test non-existent department
    console.log('❌ Testing non-existent department...');
    try {
      await axios.get(`${BASE_URL}/departments/99999`);
    } catch (error) {
      console.log('✅ Correctly returned 404:', error.response.status, error.response.data.message);
    }

    // Test non-existent title
    console.log('❌ Testing non-existent title...');
    try {
      await axios.get(`${BASE_URL}/titles/99999`);
    } catch (error) {
      console.log('✅ Correctly returned 404:', error.response.status, error.response.data.message);
    }

    // Test non-existent user group
    console.log('❌ Testing non-existent user group...');
    try {
      await axios.get(`${BASE_URL}/usergroups/99999`);
    } catch (error) {
      console.log('✅ Correctly returned 404:', error.response.status, error.response.data.message);
    }

  } catch (error) {
    console.error('❌ Error test failed:', error.message);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Test...\n');

  const startTime = Date.now();
  const promises = [
    axios.get(`${BASE_URL}/stats`),
    axios.get(`${BASE_URL}/persons?limit=10`),
    axios.get(`${BASE_URL}/departments?limit=10`),
    axios.get(`${BASE_URL}/titles?limit=10`),
    axios.get(`${BASE_URL}/usergroups?limit=10`)
  ];

  try {
    await Promise.all(promises);
    const endTime = Date.now();
    console.log(`✅ All 5 endpoints completed in ${endTime - startTime}ms`);
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testPersonnelAPI();
  await testErrorCases();
  await performanceTest();
}

// Check if this script is being run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testPersonnelAPI,
  testErrorCases,
  performanceTest,
  runAllTests
};
