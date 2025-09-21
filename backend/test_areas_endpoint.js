const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

async function testAreasEndpoint() {
  try {
    console.log('Testing Areas Endpoint...');
    console.log('========================');
    
    // Test the areas endpoint
    const response = await fetch(`${API_BASE_URL}/hierarchy/areas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to add a valid JWT token here for testing
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Success! Areas data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.success && data.data && data.data.length > 0) {
        console.log(`\n📊 Found ${data.data.length} areas:`);
        data.data.forEach((area, index) => {
          console.log(`${index + 1}. ${area.name} (${area.code}) - Plant: ${area.plant_name || 'N/A'}`);
        });
      } else {
        console.log('\n⚠️  No areas found in response');
      }
    } else {
      const errorText = await response.text();
      console.log('\n❌ Error response:');
      console.log(errorText);
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:');
    console.error(error.message);
  }
}

// Run the test
testAreasEndpoint();
