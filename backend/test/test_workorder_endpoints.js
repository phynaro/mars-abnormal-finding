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
      console.log('👤 User:', response.user?.username);
      console.log('🎫 Token:', authToken.substring(0, 20) + '...');
      return true;
    }
    throw new Error('Authentication failed');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Test: Get single work order by ID
async function testGetSingleWorkOrder(workOrderId = 201635) {
  try {
    console.log(`\n📋 Testing: Get single work order (ID: ${workOrderId})`);
    console.log('=' * 50);
    
    const response = await makeRequest('GET', `/workorders/${workOrderId}`);
    
    if (response.success) {
      console.log('✅ Successfully retrieved work order');
      
      const wo = response.data;
      console.log('\n📊 Work Order Summary:');
      console.log(`   ID: ${wo.id}`);
      console.log(`   Code: ${wo.woCode}`);
      console.log(`   Date: ${wo.date} ${wo.time}`);
      console.log(`   Problem: ${wo.problem}`);
      console.log(`   Status: ${wo.status?.name} (${wo.status?.code})`);
      console.log(`   Type: ${wo.type?.name} (${wo.type?.code})`);
      console.log(`   Requester: ${wo.requester?.name}`);
      
      // Timing information
      console.log('\n⏰ Timing Information:');
      if (wo.schedule?.startDate) {
        console.log(`   Scheduled: ${wo.schedule.startDate} ${wo.schedule.startTime} - ${wo.schedule.finishDate} ${wo.schedule.finishTime}`);
        console.log(`   Scheduled Duration: ${wo.schedule.duration} minutes`);
      } else {
        console.log('   Scheduled: Not scheduled');
      }
      
      if (wo.actual?.startDate) {
        console.log(`   Actual: ${wo.actual.startDate} ${wo.actual.startTime} - ${wo.actual.finishDate} ${wo.actual.finishTime}`);
        console.log(`   Actual Duration: ${wo.actual.duration} minutes`);
      } else {
        console.log('   Actual: Not started');
      }
      
      // Safety information
      console.log('\n🦺 Safety Requirements:');
      const safety = wo.safety;
      console.log(`   Hot Work: ${safety?.hotWork ? '⚠️ Required' : '✅ Not required'}`);
      console.log(`   Confined Space: ${safety?.confineSpace ? '⚠️ Required' : '✅ Not required'}`);
      console.log(`   Work at Height: ${safety?.workAtHeight ? '⚠️ Required' : '✅ Not required'}`);
      console.log(`   Lock Out Tag Out: ${safety?.lockOutTagOut ? '⚠️ Required' : '✅ Not required'}`);
      
      // Related information
      console.log('\n🔗 Related Records:');
      console.log(`   Work Request: ${wo.related?.wrCode || 'N/A'} (ID: ${wo.related?.wrNo || 'N/A'})`);
      console.log(`   Equipment: ${wo.equipment?.name || 'N/A'} (${wo.equipment?.code || 'N/A'})`);
      console.log(`   Production Unit: ${wo.productionUnit?.name || 'N/A'} (${wo.productionUnit?.code || 'N/A'})`);
      console.log(`   Department: ${wo.department?.name || 'N/A'} (${wo.department?.code || 'N/A'})`);
      
      // Cost information
      if (wo.costs) {
        console.log('\n💰 Cost Information:');
        console.log(`   Planned Man Hours: ${wo.costs.plannedManHours || 'N/A'}`);
        console.log(`   Actual Man Hours: ${wo.costs.actualManHours || 'N/A'}`);
        console.log(`   Planned Materials: ${wo.costs.plannedMaterials || 'N/A'}`);
        console.log(`   Actual Materials: ${wo.costs.actualMaterials || 'N/A'}`);
      }
      
      // Task procedure
      if (wo.taskProcedure) {
        console.log('\n📝 Task Procedure:');
        console.log(`   ${wo.taskProcedure}`);
      }
      
      // Raw field count
      console.log(`\n📈 Raw Database Fields: ${Object.keys(wo.allFields || {}).length} fields available`);
      
      console.log('\n✅ Single work order test completed successfully');
      return wo;
    } else {
      console.error('❌ Failed to retrieve work order');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing single work order:', error.message);
    return null;
  }
}

// Test: Get work order with non-existent ID
async function testGetNonExistentWorkOrder() {
  try {
    console.log('\n🚫 Testing: Get non-existent work order');
    console.log('=' * 50);
    
    const nonExistentId = 999999;
    const response = await makeRequest('GET', `/workorders/${nonExistentId}`);
    
    console.log('❌ Expected 404 error but got response:', response);
    return false;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent work order');
      console.log('   Message:', error.response.data.message);
      return true;
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

// Test: Get work order resources
async function testGetWorkOrderResources(workOrderId = 201635) {
  try {
    console.log(`\n🔧 Testing: Get work order resources (ID: ${workOrderId})`);
    console.log('=' * 50);
    
    const response = await makeRequest('GET', `/workorders/${workOrderId}/resources`);
    
    if (response.success) {
      console.log('✅ Successfully retrieved work order resources');
      console.log(`📊 Found ${response.data.length} resources`);
      
      if (response.data.length > 0) {
        console.log('\n🔧 Resource Details:');
        response.data.slice(0, 3).forEach((resource, index) => {
          console.log(`   ${index + 1}. ${resource.name}`);
          console.log(`      Type: ${resource.type} (${resource.subType})`);
          console.log(`      Quantity: ${resource.quantity} ${resource.unit}`);
          console.log(`      Unit Cost: ${resource.unitCost}`);
          console.log(`      Total Amount: ${resource.amount}`);
          console.log(`      Actual: ${resource.isActual ? 'Yes' : 'No'}`);
          if (resource.remark) {
            console.log(`      Remark: ${resource.remark}`);
          }
          console.log('');
        });
        
        if (response.data.length > 3) {
          console.log(`   ... and ${response.data.length - 3} more resources`);
        }
      } else {
        console.log('   No resources found for this work order');
      }
      
      return response.data;
    } else {
      console.error('❌ Failed to retrieve work order resources');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing work order resources:', error.message);
    return null;
  }
}

// Test: Get work order tasks
async function testGetWorkOrderTasks(workOrderId = 201635) {
  try {
    console.log(`\n📋 Testing: Get work order tasks (ID: ${workOrderId})`);
    console.log('=' * 50);
    
    const response = await makeRequest('GET', `/workorders/${workOrderId}/tasks`);
    
    if (response.success) {
      console.log('✅ Successfully retrieved work order tasks');
      console.log(`📊 Found ${response.data.length} tasks`);
      
      if (response.data.length > 0) {
        console.log('\n📋 Task Details:');
        response.data.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.name}`);
          console.log(`      Code: ${task.code}`);
          console.log(`      Component: ${task.component || 'N/A'}`);
          console.log(`      Duration: ${task.duration || 'N/A'} minutes`);
          console.log(`      Actual Duration: ${task.actualDuration || 'N/A'} minutes`);
          console.log(`      Done: ${task.isDone ? '✅ Yes' : '❌ No'}`);
          console.log(`      Abnormal: ${task.isAbnormal ? '⚠️ Yes' : '✅ No'}`);
          if (task.procedure) {
            console.log(`      Procedure: ${task.procedure.substring(0, 100)}${task.procedure.length > 100 ? '...' : ''}`);
          }
          if (task.remark) {
            console.log(`      Remark: ${task.remark}`);
          }
          console.log('');
        });
      } else {
        console.log('   No tasks found for this work order');
      }
      
      return response.data;
    } else {
      console.error('❌ Failed to retrieve work order tasks');
      return null;
    }
  } catch (error) {
    console.error('❌ Error testing work order tasks:', error.message);
    return null;
  }
}

// Test: Performance test with JSON formatting
async function testPerformanceAndFormatting(workOrderId = 201635) {
  try {
    console.log('\n⚡ Testing: Performance and JSON formatting');
    console.log('=' * 50);
    
    const startTime = Date.now();
    const response = await makeRequest('GET', `/workorders/${workOrderId}`);
    const endTime = Date.now();
    
    console.log(`⏱️ Response Time: ${endTime - startTime}ms`);
    
    if (response.success) {
      const jsonString = JSON.stringify(response, null, 2);
      console.log(`📄 JSON Size: ${(jsonString.length / 1024).toFixed(2)} KB`);
      console.log(`🔢 Total Fields in allFields: ${Object.keys(response.data.allFields || {}).length}`);
      
      // Validate JSON structure
      const requiredFields = ['id', 'woCode', 'status', 'type', 'schedule', 'actual', 'safety'];
      const missingFields = requiredFields.filter(field => !(field in response.data));
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present in response');
      } else {
        console.log('⚠️ Missing fields:', missingFields.join(', '));
      }
      
      // Save sample response to file for reference
      const fs = require('fs');
      const sampleFile = 'sample_workorder_response.json';
      fs.writeFileSync(sampleFile, jsonString);
      console.log(`💾 Sample response saved to: ${sampleFile}`);
      
      return true;
    } else {
      console.error('❌ Failed to get response for performance test');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in performance test:', error.message);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Work Order API Tests');
  console.log('='.repeat(60));
  
  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Test data
  const testWorkOrderId = 201635; // Known work order ID from our data
  
  try {
    // Test 1: Get single work order
    await testGetSingleWorkOrder(testWorkOrderId);
    
    // Test 2: Get non-existent work order
    await testGetNonExistentWorkOrder();
    
    // Test 3: Get work order resources
    await testGetWorkOrderResources(testWorkOrderId);
    
    // Test 4: Get work order tasks
    await testGetWorkOrderTasks(testWorkOrderId);
    
    // Test 5: Performance and formatting
    await testPerformanceAndFormatting(testWorkOrderId);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
  
  console.log('\n🏁 Work Order API Tests Completed');
  console.log('='.repeat(60));
}

// Quick test function for single work order only
async function quickTest(workOrderId = 201635) {
  console.log('🚀 Quick Test: Single Work Order');
  console.log('='.repeat(40));
  
  const authSuccess = await authenticate();
  if (!authSuccess) return;
  
  const workOrder = await testGetSingleWorkOrder(workOrderId);
  
  if (workOrder) {
    console.log('\n📋 Quick Summary:');
    console.log(`   Work Order: ${workOrder.woCode}`);
    console.log(`   Status: ${workOrder.status?.name}`);
    console.log(`   Problem: ${workOrder.problem?.substring(0, 50)}...`);
    console.log('✅ Quick test completed');
  } else {
    console.log('❌ Quick test failed');
  }
}

// Export functions for use in other scripts
module.exports = {
  authenticate,
  testGetSingleWorkOrder,
  testGetNonExistentWorkOrder,
  testGetWorkOrderResources,
  testGetWorkOrderTasks,
  testPerformanceAndFormatting,
  runAllTests,
  quickTest
};

// Run tests if this script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    const workOrderId = args.find(arg => arg.startsWith('--id='))?.split('=')[1];
    quickTest(workOrderId ? parseInt(workOrderId) : undefined);
  } else if (args.includes('--single')) {
    const workOrderId = args.find(arg => arg.startsWith('--id='))?.split('=')[1];
    (async () => {
      const authSuccess = await authenticate();
      if (authSuccess) {
        await testGetSingleWorkOrder(workOrderId ? parseInt(workOrderId) : undefined);
      }
    })();
  } else {
    runAllTests();
  }
}
