const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'phynaro',
  password: 'Jir@202501'
};

async function testHierarchy() {
  try {
    console.log('🔐 Authenticating...');
    const authResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    const token = authResponse.data.token;
    
    console.log('🌳 Testing Asset Hierarchy for MARS (Site 3)...');
    const hierarchyResponse = await axios.get(`${BASE_URL}/assets/hierarchy?siteNo=3`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = hierarchyResponse.data.data;
    const marsData = data[3]; // Site 3 is MARS
    
    if (marsData) {
      console.log('✅ MARS Site Data:');
      console.log(`   Site: ${marsData.SiteName} (${marsData.SiteCode})`);
      console.log(`   Departments: ${Object.keys(marsData.departments).length}`);
      
      // List departments
      for (const [deptKey, dept] of Object.entries(marsData.departments)) {
        const puCount = Object.keys(dept.productionUnits).length;
        let totalEqCount = 0;
        
        // Count equipment
        for (const pu of Object.values(dept.productionUnits)) {
          totalEqCount += Object.keys(pu.equipment).length;
        }
        
        console.log(`   📁 ${dept.DEPTNAME} (${dept.DEPTCODE})`);
        console.log(`      - Production Units: ${puCount}`);
        console.log(`      - Equipment: ${totalEqCount}`);
        console.log(`      - Virtual: ${dept.virtual || false}`);
      }
    } else {
      console.log('❌ No data found for MARS site');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testHierarchy();
