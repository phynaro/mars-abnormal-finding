const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'phynaro', // Update with valid test credentials
  password: 'Jir@202501'
};

let authToken = null;

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      data
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error ${method} ${endpoint}:`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Authentication
async function authenticate() {
  try {
    console.log('🔐 Authenticating...');
    const response = await makeRequest('POST', '/auth/login', TEST_USER);
    if (response.success && response.token) {
      authToken = response.token;
      console.log('✅ Authentication successful');
      return true;
    }
    throw new Error('Authentication failed');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Test functions
async function testGetSites() {
  console.log('\n📍 Testing Get Sites...');
  try {
    const result = await makeRequest('GET', '/assets/sites');
    console.log('✅ Sites:', result.data?.length || 0, 'sites found');
    return result.data;
  } catch (error) {
    console.error('❌ Get Sites failed');
    return null;
  }
}

async function testGetDepartments(siteNo) {
  console.log(`\n🏢 Testing Get Departments for Site ${siteNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/sites/${siteNo}/departments`);
    console.log('✅ Departments:', result.data?.length || 0, 'departments found');
    return result.data;
  } catch (error) {
    console.error('❌ Get Departments failed');
    return null;
  }
}

async function testGetProductionUnits(siteNo) {
  console.log(`\n🏭 Testing Get Production Units for Site ${siteNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/production-units?siteNo=${siteNo}&limit=10`);
    console.log('✅ Production Units:', result.data?.length || 0, 'units found');
    console.log('📊 Pagination:', result.pagination);
    return result.data;
  } catch (error) {
    console.error('❌ Get Production Units failed');
    return null;
  }
}

async function testGetEquipment(siteNo) {
  console.log(`\n⚙️ Testing Get Equipment for Site ${siteNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/equipment?siteNo=${siteNo}&limit=10`);
    console.log('✅ Equipment:', result.data?.length || 0, 'items found');
    console.log('📊 Pagination:', result.pagination);
    return result.data;
  } catch (error) {
    console.error('❌ Get Equipment failed');
    return null;
  }
}

async function testGetProductionUnitDetails(puNo) {
  console.log(`\n🔍 Testing Get Production Unit Details for PU ${puNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/production-units/${puNo}`);
    console.log('✅ PU Details:', result.data?.PUNAME);
    console.log('   Children:', result.data?.children?.length || 0);
    console.log('   Equipment:', result.data?.equipment?.length || 0);
    return result.data;
  } catch (error) {
    console.error('❌ Get Production Unit Details failed');
    return null;
  }
}

async function testGetEquipmentDetails(eqNo) {
  console.log(`\n🔧 Testing Get Equipment Details for EQ ${eqNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/equipment/${eqNo}`);
    console.log('✅ Equipment Details:', result.data?.EQNAME);
    console.log('   Children:', result.data?.children?.length || 0);
    return result.data;
  } catch (error) {
    console.error('❌ Get Equipment Details failed');
    return null;
  }
}

async function testGetLookupData() {
  console.log('\n📋 Testing Get Lookup Data...');
  try {
    const result = await makeRequest('GET', '/assets/lookup');
    console.log('✅ Lookup Data:');
    console.log('   PU Types:', result.data?.puTypes?.length || 0);
    console.log('   PU Statuses:', result.data?.puStatuses?.length || 0);
    console.log('   EQ Types:', result.data?.eqTypes?.length || 0);
    console.log('   EQ Statuses:', result.data?.eqStatuses?.length || 0);
    console.log('   Sites:', result.data?.sites?.length || 0);
    console.log('   Departments:', result.data?.departments?.length || 0);
    return result.data;
  } catch (error) {
    console.error('❌ Get Lookup Data failed');
    return null;
  }
}

async function testGetAssetStatistics(siteNo) {
  console.log(`\n📊 Testing Get Asset Statistics for Site ${siteNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/statistics?siteNo=${siteNo}`);
    console.log('✅ Asset Statistics:');
    console.log('   Total PUs:', result.data?.totals?.productionUnits || 0);
    console.log('   Total Equipment:', result.data?.totals?.equipment || 0);
    console.log('   PU Status Distribution:', result.data?.puByStatus?.length || 0, 'statuses');
    console.log('   EQ Status Distribution:', result.data?.eqByStatus?.length || 0, 'statuses');
    return result.data;
  } catch (error) {
    console.error('❌ Get Asset Statistics failed');
    return null;
  }
}

async function testGetAssetHierarchy(siteNo) {
  console.log(`\n🌳 Testing Get Asset Hierarchy for Site ${siteNo}...`);
  try {
    const result = await makeRequest('GET', `/assets/hierarchy?siteNo=${siteNo}`);
    console.log('✅ Asset Hierarchy loaded');
    const siteData = Object.values(result.data)[0];
    if (siteData) {
      const deptCount = Object.keys(siteData.departments || {}).length;
      console.log('   Departments:', deptCount);
      
      let totalPUs = 0;
      let totalEQs = 0;
      Object.values(siteData.departments || {}).forEach(dept => {
        const puCount = Object.keys(dept.productionUnits || {}).length;
        totalPUs += puCount;
        Object.values(dept.productionUnits || {}).forEach(pu => {
          totalEQs += Object.keys(pu.equipment || {}).length;
        });
      });
      console.log('   Total PUs in hierarchy:', totalPUs);
      console.log('   Total Equipment in hierarchy:', totalEQs);
    }
    return result.data;
  } catch (error) {
    console.error('❌ Get Asset Hierarchy failed');
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Asset Management API Tests...\n');
  
  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n❌ Cannot proceed with tests - authentication failed');
    return;
  }

  // Run tests
  const sites = await testGetSites();
  
  if (sites && sites.length > 0) {
    const testSite = sites.find(s => s.SiteCode === 'MARS') || sites[0];
    const siteNo = testSite.SiteNo;
    
    console.log(`\n🎯 Using test site: ${testSite.SiteName} (${testSite.SiteCode})`);
    
    // Test all endpoints
    const departments = await testGetDepartments(siteNo);
    const productionUnits = await testGetProductionUnits(siteNo);
    const equipment = await testGetEquipment(siteNo);
    await testGetLookupData();
    await testGetAssetStatistics(siteNo);
    
    // Test details endpoints if we have data
    if (productionUnits && productionUnits.length > 0) {
      await testGetProductionUnitDetails(productionUnits[0].PUNO);
    }
    
    if (equipment && equipment.length > 0) {
      await testGetEquipmentDetails(equipment[0].EQNO);
    }
    
    // Test hierarchy (limited to prevent excessive output)
    await testGetAssetHierarchy(siteNo);
  }
  
  console.log('\n✅ Asset Management API Tests Completed!');
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
