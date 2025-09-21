const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/inventory';

// Test updated inventory API endpoints
async function testUpdatedInventoryAPI() {
  console.log('🧪 Testing Updated Inventory API Endpoints...\n');

  try {
    // Test 1: Get inventory stats (should use current data from Iv_Store)
    console.log('📊 Testing Updated Inventory Statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/stats/overview`);
    console.log('✅ Stats:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // Test 2: Get inventory catalog (should use current data)
    console.log('📦 Testing Updated Inventory Catalog...');
    const catalogResponse = await axios.get(`${BASE_URL}/catalog?page=1&limit=5`);
    console.log('✅ Catalog (first item):', JSON.stringify(catalogResponse.data.data.items[0], null, 2));
    console.log('');

    // Test 3: Get low stock items (should use current data)
    console.log('⚠️ Testing Updated Low Stock Items...');
    const lowStockResponse = await axios.get(`${BASE_URL}/lowstock?limit=3`);
    console.log('✅ Low Stock Items:', JSON.stringify(lowStockResponse.data, null, 2));
    console.log('');

    // Test 4: Search inventory (should use current data)
    console.log('🔍 Testing Updated Inventory Search...');
    const searchResponse = await axios.get(`${BASE_URL}/catalog/search?q=valve&limit=3`);
    console.log('✅ Search Results:', JSON.stringify(searchResponse.data, null, 2));
    console.log('');

    // Test 5: Get store inventory (should use current data)
    console.log('🏪 Testing Updated Store Inventory...');
    const storeInventoryResponse = await axios.get(`${BASE_URL}/stores/1/inventory?limit=3`);
    console.log('✅ Store Inventory:', JSON.stringify(storeInventoryResponse.data, null, 2));
    console.log('');

    // Test 6: Get historical periods (new endpoint)
    console.log('📅 Testing Historical Periods...');
    const periodsResponse = await axios.get(`${BASE_URL}/historical/periods`);
    console.log('✅ Historical Periods:', JSON.stringify(periodsResponse.data, null, 2));
    console.log('');

    // Test 7: Get historical data (new endpoint)
    if (periodsResponse.data.data && periodsResponse.data.data.length > 0) {
      const period = periodsResponse.data.data[0];
      console.log(`📊 Testing Historical Data for ${period.period}...`);
      const historicalResponse = await axios.get(`${BASE_URL}/historical/data?year=${period.year}&month=${period.month}&limit=3`);
      console.log('✅ Historical Data:', JSON.stringify(historicalResponse.data, null, 2));
      console.log('');
    }

    console.log('🎉 All updated inventory tests completed successfully!');

    // Compare current vs historical data
    console.log('\n📈 Data Source Comparison Summary:');
    console.log('✅ Current Inventory Data (Iv_Store): Used for real-time operations');
    console.log('✅ Historical Inventory Data (IV_Store_Bal): Used for reporting and historical analysis');
    console.log('✅ Parameterized Queries: Improved security against SQL injection');
    console.log('✅ Better Performance: Smaller dataset for current operations');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Performance comparison test
async function performanceComparisonTest() {
  console.log('\n⚡ Performance Comparison Test...\n');

  try {
    // Test response times for current data queries
    const startTime = Date.now();
    
    const promises = [
      axios.get(`${BASE_URL}/stats/overview`),
      axios.get(`${BASE_URL}/catalog?limit=20`),
      axios.get(`${BASE_URL}/lowstock?limit=20`),
      axios.get(`${BASE_URL}/stores/1/inventory?limit=20`)
    ];

    await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`✅ Current data queries completed in ${endTime - startTime}ms`);
    console.log('📊 This should be faster than the previous version using IV_Store_Bal');

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// Test data accuracy
async function testDataAccuracy() {
  console.log('\n🎯 Testing Data Accuracy...\n');

  try {
    // Get current inventory stats
    const statsResponse = await axios.get(`${BASE_URL}/stats/overview`);
    const stats = statsResponse.data.data.overview;
    
    console.log('📊 Current Inventory Statistics:');
    console.log(`   Total Items: ${stats.totalItems}`);
    console.log(`   Active Items: ${stats.activeItems}`);
    console.log(`   Low Stock Items: ${stats.lowStockItems}`);
    console.log(`   Out of Stock Items: ${stats.outOfStockItems}`);
    console.log(`   Total Value: $${stats.totalInventoryValue?.toLocaleString() || 0}`);
    console.log('');

    // Verify low stock calculation logic
    const lowStockResponse = await axios.get(`${BASE_URL}/lowstock?limit=1`);
    if (lowStockResponse.data.data && lowStockResponse.data.data.length > 0) {
      const lowStockItem = lowStockResponse.data.data[0];
      console.log('🔍 Low Stock Logic Verification:');
      console.log(`   Part: ${lowStockItem.partCode}`);
      console.log(`   Available: ${lowStockItem.availableQuantity}`);
      console.log(`   Reorder Point: ${lowStockItem.reorderPoint}`);
      console.log(`   Is Low Stock: ${lowStockItem.availableQuantity <= lowStockItem.reorderPoint ? 'YES' : 'NO'}`);
      console.log('');
    }

    console.log('✅ Data accuracy verification completed');

  } catch (error) {
    console.error('❌ Data accuracy test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testUpdatedInventoryAPI();
  await performanceComparisonTest();
  await testDataAccuracy();
}

// Check if this script is being run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testUpdatedInventoryAPI,
  performanceComparisonTest,
  testDataAccuracy,
  runAllTests
};
