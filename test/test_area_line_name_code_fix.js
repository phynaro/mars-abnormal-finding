/**
 * Test script to verify Area and Line name/code fix
 * 
 * This script tests the administration lookup API to ensure that
 * area.name and line.name return different values from area.code and line.code
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  
  return data;
}

async function testAreaLineNameCodeFix() {
  console.log('🔍 Testing Area and Line name/code fix...\n');

  try {
    // Get lookup data
    console.log('1️⃣ Fetching lookup data...');
    const lookupData = await makeRequest(`${API_BASE_URL}/administration/lookup`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}` 
      }
    });
    
    if (!lookupData.success) {
      throw new Error('Failed to fetch lookup data');
    }
    
    const { plants, areas, lines } = lookupData.data;
    
    console.log(`✅ Fetched ${plants.length} plants, ${areas.length} areas, ${lines.length} lines`);
    
    // Test Areas
    console.log('\n2️⃣ Testing Areas...');
    let areaIssues = 0;
    areas.forEach((area, index) => {
      if (area.name === area.code) {
        console.log(`❌ Area ${index + 1}: name and code are the same (${area.name})`);
        areaIssues++;
      } else {
        console.log(`✅ Area ${index + 1}: name="${area.name}", code="${area.code}"`);
      }
    });
    
    if (areaIssues === 0) {
      console.log('✅ All areas have different name and code values');
    } else {
      console.log(`❌ Found ${areaIssues} areas with same name and code`);
    }
    
    // Test Lines
    console.log('\n3️⃣ Testing Lines...');
    let lineIssues = 0;
    lines.forEach((line, index) => {
      if (line.name === line.code) {
        console.log(`❌ Line ${index + 1}: name and code are the same (${line.name})`);
        lineIssues++;
      } else {
        console.log(`✅ Line ${index + 1}: name="${line.name}", code="${line.code}"`);
      }
    });
    
    if (lineIssues === 0) {
      console.log('✅ All lines have different name and code values');
    } else {
      console.log(`❌ Found ${lineIssues} lines with same name and code`);
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Areas: ${areas.length - areaIssues}/${areas.length} correct`);
    console.log(`   Lines: ${lines.length - lineIssues}/${lines.length} correct`);
    
    if (areaIssues === 0 && lineIssues === 0) {
      console.log('\n🎉 All tests passed! Area and Line name/code issue is fixed.');
    } else {
      console.log('\n⚠️  Some issues remain. Check the backend SQL queries.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testAreaLineNameCodeFix();
}

module.exports = { testAreaLineNameCodeFix };
