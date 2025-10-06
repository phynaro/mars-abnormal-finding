const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/administration';

// Test function to verify foreign key constraint error handling
async function testForeignKeyErrors() {
  try {
    console.log('🧪 Testing Foreign Key Constraint Error Handling...\n');

    // Test 1: Try to delete a plant that has areas
    console.log('1. Testing Plant deletion with associated areas...');
    try {
      await axios.delete(`${API_BASE_URL}/plants/1`, {
        headers: {
          'Authorization': 'Bearer your-test-token-here'
        }
      });
      console.log('❌ Expected error but deletion succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Plant deletion properly blocked:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 2: Try to delete an area that has lines
    console.log('\n2. Testing Area deletion with associated lines...');
    try {
      await axios.delete(`${API_BASE_URL}/areas/1`, {
        headers: {
          'Authorization': 'Bearer your-test-token-here'
        }
      });
      console.log('❌ Expected error but deletion succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Area deletion properly blocked:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 3: Try to delete a line that has machines
    console.log('\n3. Testing Line deletion with associated machines...');
    try {
      await axios.delete(`${API_BASE_URL}/lines/1`, {
        headers: {
          'Authorization': 'Bearer your-test-token-here'
        }
      });
      console.log('❌ Expected error but deletion succeeded');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Line deletion properly blocked:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 Foreign key constraint error handling test Finished!');
    console.log('\n📝 Note: To test with real data, make sure you have:');
    console.log('   - A plant with associated areas');
    console.log('   - An area with associated lines');
    console.log('   - A line with associated machines');
    console.log('   - Valid authentication token');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testForeignKeyErrors();
