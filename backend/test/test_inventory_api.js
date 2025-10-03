#!/usr/bin/env node

/**
 * Inventory API Test Script
 * Usage: node test_inventory_api.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'phynaro',
  password: 'Jir@202501'
};

let authToken = null;

// Helper function to make requests
async function makeRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    data
  };
  
  const response = await axios(config);
  return response.data;
}

// Authentication
async function authenticate() {
  try {
    console.log('🔐 Authenticating...');
    const response = await makeRequest('POST', '/auth/login', TEST_USER);
    
    if (!response.success || !response.token) {
      throw new Error('Authentication failed');
    }
    
    authToken = response.token;
    console.log('✅ Authenticated successfully');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Test inventory catalog
async function testInventoryCatalog() {
  try {
    console.log('\n📦 Testing Inventory Catalog...');
    
    const response = await makeRequest('GET', '/inventory/catalog?page=1&limit=5');
    
    if (response.success) {
      console.log('✅ Inventory catalog retrieved successfully');
      console.log(`📊 Found ${response.data.pagination.total} total items`);
      
      if (response.data.items.length > 0) {
        const item = response.data.items[0];
        console.log('\n📋 Sample Item:');
        console.log(`   Part Code: ${item.partCode}`);
        console.log(`   Part Name: ${item.partName}`);
        console.log(`   Group: ${item.group?.name || 'N/A'}`);
        console.log(`   Unit Cost: ${item.costs?.unitCost || 'N/A'}`);
        console.log(`   Available: ${item.stock?.available || 'N/A'}`);
        console.log(`   Store: ${item.store?.name || 'N/A'}`);
        
        // Test getting single item
        console.log('\n🔍 Testing single item retrieval...');
        const singleItem = await makeRequest('GET', `/inventory/catalog/${item.id}`);
        if (singleItem.success) {
          console.log('✅ Single item retrieved successfully');
          console.log(`   Description: ${singleItem.data.description}`);
          console.log(`   Vendor: ${singleItem.data.vendor?.name || 'N/A'}`);
        }
      }
    } else {
      console.log('❌ Failed to retrieve inventory catalog');
    }
  } catch (error) {
    console.error('❌ Error testing inventory catalog:', error.message);
  }
}

// Test inventory search
async function testInventorySearch() {
  try {
    console.log('\n🔍 Testing Inventory Search...');
    
    const searchTerms = ['bearing', 'valve', 'motor', 'seal'];
    
    for (const term of searchTerms) {
      try {
        const response = await makeRequest('GET', `/inventory/catalog/search?q=${term}&limit=3`);
        
        if (response.success) {
          console.log(`✅ Search for "${term}": ${response.data.length} results`);
          if (response.data.length > 0) {
            console.log(`   First result: ${response.data[0].partCode} - ${response.data[0].partName}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Search for "${term}" failed: ${error.response?.status || error.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Error testing inventory search:', error.message);
  }
}

// Test stores
async function testStores() {
  try {
    console.log('\n🏪 Testing Stores...');
    
    const response = await makeRequest('GET', '/inventory/stores?page=1&limit=5');
    
    if (response.success) {
      console.log('✅ Stores retrieved successfully');
      console.log(`📊 Found ${response.data.pagination.total} total stores`);
      
      if (response.data.stores.length > 0) {
        const store = response.data.stores[0];
        console.log('\n🏪 Sample Store:');
        console.log(`   Store Code: ${store.storeCode}`);
        console.log(`   Store Name: ${store.storeName}`);
        console.log(`   Total Items: ${store.totalItems}`);
        console.log(`   Total Value: ${store.totalValue}`);
        
        // Test store inventory
        console.log('\n📦 Testing store inventory...');
        try {
          const inventory = await makeRequest('GET', `/inventory/stores/${store.id}/inventory?limit=3`);
          if (inventory.success) {
            console.log(`✅ Store inventory retrieved: ${inventory.data.inventory.length} items`);
            if (inventory.data.inventory.length > 0) {
              const item = inventory.data.inventory[0];
              console.log(`   Sample: ${item.partCode} - Available: ${item.quantities.available}`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Store inventory test failed: ${error.response?.status || error.message}`);
        }
      }
    } else {
      console.log('❌ Failed to retrieve stores');
    }
  } catch (error) {
    console.error('❌ Error testing stores:', error.message);
  }
}

// Test vendors
async function testVendors() {
  try {
    console.log('\n🏢 Testing Vendors...');
    
    const response = await makeRequest('GET', '/inventory/vendors?limit=5');
    
    if (response.success) {
      console.log('✅ Vendors retrieved successfully');
      console.log(`📊 Found ${response.data.length} vendors in sample`);
      
      if (response.data.length > 0) {
        const vendor = response.data[0];
        console.log('\n🏢 Sample Vendor:');
        console.log(`   Vendor Code: ${vendor.vendorCode}`);
        console.log(`   Vendor Name: ${vendor.vendorName}`);
        console.log(`   Total Parts: ${vendor.totalParts}`);
        console.log(`   Phone: ${vendor.phone || 'N/A'}`);
        console.log(`   Email: ${vendor.email || 'N/A'}`);
      }
    } else {
      console.log('❌ Failed to retrieve vendors');
    }
  } catch (error) {
    console.error('❌ Error testing vendors:', error.message);
  }
}

// Test statistics
async function testStatistics() {
  try {
    console.log('\n📊 Testing Inventory Statistics...');
    
    const response = await makeRequest('GET', '/inventory/stats/overview');
    
    if (response.success) {
      console.log('✅ Statistics retrieved successfully');
      
      const stats = response.data.overview;
      console.log('\n📈 Inventory Overview:');
      console.log(`   Total Items: ${stats.totalItems.toLocaleString()}`);
      console.log(`   Active Items: ${stats.activeItems.toLocaleString()}`);
      console.log(`   Low Stock Items: ${stats.lowStockItems.toLocaleString()}`);
      console.log(`   Out of Stock: ${stats.outOfStockItems.toLocaleString()}`);
      console.log(`   Total Value: $${stats.totalInventoryValue.toLocaleString()}`);
      console.log(`   Average Unit Cost: $${stats.avgUnitCost}`);
      console.log(`   Total Vendors: ${stats.totalVendors.toLocaleString()}`);
      console.log(`   Total Stores: ${stats.totalStores.toLocaleString()}`);
      
      if (response.data.byGroup && response.data.byGroup.length > 0) {
        console.log('\n🏷️ By Group:');
        response.data.byGroup.slice(0, 3).forEach(group => {
          console.log(`   ${group.IVGROUPNAME}: ${group.itemCount} items, $${group.totalValue?.toLocaleString() || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ Failed to retrieve statistics');
    }
  } catch (error) {
    console.error('❌ Error testing statistics:', error.message);
  }
}

// Test low stock items
async function testLowStock() {
  try {
    console.log('\n⚠️ Testing Low Stock Items...');
    
    const response = await makeRequest('GET', '/inventory/lowstock?limit=5');
    
    if (response.success) {
      console.log('✅ Low stock items retrieved successfully');
      console.log(`📊 Found ${response.data.length} low stock items`);
      
      if (response.data.length > 0) {
        console.log('\n⚠️ Low Stock Alert:');
        response.data.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.partCode} - ${item.partName}`);
          console.log(`      Available: ${item.availableQuantity}, Reorder Point: ${item.reorderPoint}`);
          console.log(`      Shortage: ${item.shortage} units`);
          console.log(`      Store: ${item.store.name}`);
          console.log('');
        });
      } else {
        console.log('✅ No low stock items found - inventory levels are healthy!');
      }
    } else {
      console.log('❌ Failed to retrieve low stock items');
    }
  } catch (error) {
    console.error('❌ Error testing low stock:', error.message);
  }
}

// Test reference data
async function testReferenceData() {
  try {
    console.log('\n📚 Testing Reference Data...');
    
    // Test units
    const units = await makeRequest('GET', '/inventory/units');
    if (units.success) {
      console.log(`✅ Units: ${units.data.length} units found`);
      if (units.data.length > 0) {
        console.log(`   Sample: ${units.data[0].code} - ${units.data[0].name}`);
      }
    }
    
    // Test groups
    const groups = await makeRequest('GET', '/inventory/groups');
    if (groups.success) {
      console.log(`✅ Groups: ${groups.data.length} groups found`);
      if (groups.data.length > 0) {
        console.log(`   Sample: ${groups.data[0].code} - ${groups.data[0].name} (${groups.data[0].itemCount} items)`);
      }
    }
    
    // Test types
    const types = await makeRequest('GET', '/inventory/types');
    if (types.success) {
      console.log(`✅ Types: ${types.data.length} types found`);
      if (types.data.length > 0) {
        console.log(`   Sample: ${types.data[0].code} - ${types.data[0].name} (${types.data[0].itemCount} items)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing reference data:', error.message);
  }
}

// Main test function
async function runInventoryTests() {
  console.log('🚀 Starting Inventory API Tests');
  console.log('='.repeat(50));
  
  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  try {
    // Run all tests
    await testInventoryCatalog();
    await testInventorySearch();
    await testStores();
    await testVendors();
    await testStatistics();
    await testLowStock();
    await testReferenceData();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
  
  console.log('\n🏁 Inventory API Tests Completed');
  console.log('='.repeat(50));
}

// Export for use in other scripts
module.exports = {
  authenticate,
  testInventoryCatalog,
  testInventorySearch,
  testStores,
  testVendors,
  testStatistics,
  testLowStock,
  testReferenceData,
  runInventoryTests
};

// Run tests if this script is executed directly
if (require.main === module) {
  runInventoryTests();
}
