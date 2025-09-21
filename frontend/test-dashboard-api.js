// Simple test to verify the dashboard API endpoint
const testDashboardAPI = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/dashboard/workorder-volume-trend?startDate=2024-01-01&endDate=2024-01-31&groupBy=daily', {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Dashboard API Response:', data);
    
    // Check if the response structure is correct
    if (data.success && data.data && Array.isArray(data.data.trend)) {
      console.log('✅ API Response structure is correct');
      console.log('Trend data points:', data.data.trend.length);
      console.log('Sample trend point:', data.data.trend[0]);
    } else {
      console.log('❌ API Response structure is incorrect');
      console.log('Expected: { success: true, data: { trend: [...] } }');
      console.log('Received:', data);
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
};

// Run the test
testDashboardAPI();
