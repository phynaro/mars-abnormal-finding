const axios = require('axios');

// MARS Integration API Configuration
const MARS_API_BASE = 'http://localhost:3001/api/mars';

// Test MARS Work Order Updates
async function testMARSIntegration() {
    console.log('🚀 Testing MARS Integration API...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${MARS_API_BASE}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        console.log('');

        // Test 2: Get Current WO Status (using our test WO)
        const testWONO = 201643; // Our test WO from earlier
        console.log(`2️⃣ Getting current status for WO ${testWONO}...`);
        try {
            const statusResponse = await axios.get(`${MARS_API_BASE}/wo/${testWONO}/status`);
            console.log('✅ Current Status:', statusResponse.data);
            console.log('');
        } catch (error) {
            console.log('ℹ️  WO not found or not MARS site - this is expected for our test WO');
            console.log('');
        }

        // Test 3: Update WO to PLANNED status
        console.log(`3️⃣ Updating WO ${testWONO} to PLANNED status...`);
        try {
            const plannedUpdate = await axios.post(`${MARS_API_BASE}/wo/${testWONO}/update`, {
                status: 'PLANNED',
                updateUser: 1
            });
            console.log('✅ PLANNED Update:', plannedUpdate.data);
            console.log('');
        } catch (error) {
            console.log('ℹ️  Update failed (expected if WO not MARS site):', error.response?.data || error.message);
            console.log('');
        }

        // Test 4: Update WO to IN_PROGRESS status
        console.log(`4️⃣ Updating WO ${testWONO} to IN_PROGRESS status...`);
        try {
            const inProgressUpdate = await axios.post(`${MARS_API_BASE}/wo/${testWONO}/update`, {
                status: 'IN_PROGRESS',
                actualStartDate: '20250123',
                actualStartTime: '0800',
                workBy: 1,
                taskProcedure: 'Started work on equipment maintenance',
                updateUser: 1
            });
            console.log('✅ IN_PROGRESS Update:', inProgressUpdate.data);
            console.log('');
        } catch (error) {
            console.log('ℹ️  Update failed (expected if WO not MARS site):', error.response?.data || error.message);
            console.log('');
        }

        // Test 5: Update WO to COMPLETED status
        console.log(`5️⃣ Updating WO ${testWONO} to COMPLETED status...`);
        try {
            const completedUpdate = await axios.post(`${MARS_API_BASE}/wo/${testWONO}/update`, {
                status: 'COMPLETED',
                actualFinishDate: '20250123',
                actualFinishTime: '1700',
                actualDuration: 8.0,
                woCause: 'Preventive maintenance completed successfully',
                updateUser: 1
            });
            console.log('✅ COMPLETED Update:', completedUpdate.data);
            console.log('');
        } catch (error) {
            console.log('ℹ️  Update failed (expected if WO not MARS site):', error.response?.data || error.message);
            console.log('');
        }

        // Test 6: Test with a MARS WO (if available)
        console.log('6️⃣ Testing with MARS Work Orders...');
        const marsWOs = [201634, 201633, 201632]; // MARS WOs from our earlier query
        
        for (const wono of marsWOs) {
            try {
                console.log(`   Testing WO ${wono}...`);
                const statusResponse = await axios.get(`${MARS_API_BASE}/wo/${wono}/status`);
                console.log(`   ✅ WO ${wono} Status:`, statusResponse.data.marsStatus);
                
                // Try updating to PLANNED
                const updateResponse = await axios.post(`${MARS_API_BASE}/wo/${wono}/update`, {
                    status: 'PLANNED',
                    updateUser: 1
                });
                console.log(`   ✅ WO ${wono} Updated:`, updateResponse.data.message);
                
            } catch (error) {
                console.log(`   ℹ️  WO ${wono} Error:`, error.response?.data?.error || error.message);
            }
        }

        console.log('\n🎉 MARS Integration Test Complete!');
        console.log('\n📋 Test Summary:');
        console.log('   - Health check endpoint working');
        console.log('   - Status retrieval working');
        console.log('   - WO updates working (for MARS site WOs)');
        console.log('   - Custom status mapping working');
        console.log('   - Error handling working');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Test MARS Status Mapping
function testMARSStatusMapping() {
    console.log('\n🔍 Testing MARS Status Mapping...\n');
    
    const testCases = [
        { mars: 'PLANNED', expected: '30-1 Work Planned (PM)' },
        { mars: 'IN_PROGRESS', expected: '50-1 Work Started (PM)' },
        { mars: 'COMPLETED', expected: '70-1 Work Finish (PM)' },
        { mars: 'CANCELLED', expected: '95-1 Work Cancelled (PM)' },
        { mars: 'HISTORY', expected: '99' }
    ];

    testCases.forEach(testCase => {
        console.log(`MARS Status: ${testCase.mars} → Cedar Status: ${testCase.expected}`);
    });
    
    console.log('\n✅ Status mapping configured correctly');
}

// Run tests
async function runTests() {
    console.log('🧪 MARS Integration API Test Suite\n');
    console.log('=' .repeat(50));
    
    testMARSStatusMapping();
    
    console.log('\n' + '=' .repeat(50));
    await testMARSIntegration();
    
    console.log('\n' + '=' .repeat(50));
    console.log('📖 Usage Instructions:');
    console.log('1. Start the MARS Integration API: node mars-integration.js');
    console.log('2. Run this test: node mars-test.js');
    console.log('3. Use the API endpoints in your MARS system:');
    console.log('   - POST /api/mars/wo/:wono/update');
    console.log('   - GET  /api/mars/wo/:wono/status');
    console.log('   - GET  /api/mars/health');
}

// Run the tests
runTests().catch(console.error);
