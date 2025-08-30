const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIxLCJ1c2VybmFtZSI6InBoeW5hcm8iLCJyb2xlIjoiTDNfTWFuYWdlciIsInBlcm1pc3Npb25MZXZlbCI6MywiaWF0IjoxNzU2NDU1NjQ0LCJleHAiOjE3NTY1NDIwNDR9.8G3jo2LHEyrxir28VOc1eYdIBdY5LvZ6dETEEkO7nnY'; // Replace with actual test token

// Test data
const testTicket = {
    title: 'Test Workflow Ticket',
    description: 'Testing the new workflow endpoints',
    affected_point_type: 'machine',
    affected_point_name: 'Test Machine',
    severity_level: 'medium',
    priority: 'normal'
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
        return null;
    }
};

// Test workflow endpoints
const testWorkflow = async () => {
    console.log('🚀 Testing Ticket Workflow Endpoints\n');

    // 1. Create a test ticket
    console.log('1. Creating test ticket...');
    const createResult = await makeRequest('POST', '/tickets', testTicket);
    if (!createResult?.success) {
        console.log('❌ Failed to create ticket');
        return;
    }
    
    const ticketId = createResult.data.id;
    console.log(`✅ Ticket created with ID: ${ticketId}`);

    // 2. Accept the ticket (L2)
    console.log('\n2. Accepting ticket...');
    const acceptResult = await makeRequest('POST', `/tickets/${ticketId}/accept`, {
        notes: 'Ticket accepted for testing'
    });
    if (acceptResult?.success) {
        console.log('✅ Ticket accepted successfully');
    } else {
        console.log('❌ Failed to accept ticket');
    }

    // 3. Complete the job (L2)
    console.log('\n3. Completing job...');
    const completeResult = await makeRequest('POST', `/tickets/${ticketId}/complete`, {
        completion_notes: 'Job completed for testing',
        actual_downtime_hours: 2.5
    });
    if (completeResult?.success) {
        console.log('✅ Job completed successfully');
    } else {
        console.log('❌ Failed to complete job');
    }

    // 4. Close the ticket (Requestor)
    console.log('\n4. Closing ticket...');
    const closeResult = await makeRequest('POST', `/tickets/${ticketId}/close`, {
        close_reason: 'Testing completed successfully',
        satisfaction_rating: 5
    });
    if (closeResult?.success) {
        console.log('✅ Ticket closed successfully');
    } else {
        console.log('❌ Failed to close ticket');
    }

    // 5. Test rejection flow
    console.log('\n5. Testing rejection flow...');
    const testTicket2 = {
        title: 'Test Rejection Ticket',
        description: 'Testing rejection workflow',
        affected_point_type: 'area',
        affected_point_name: 'Test Area',
        severity_level: 'low',
        priority: 'normal'
    };

    const createResult2 = await makeRequest('POST', '/tickets', testTicket2);
    if (createResult2?.success) {
        const ticketId2 = createResult2.data.id;
        console.log(`✅ Second ticket created with ID: ${ticketId2}`);

        // Reject and escalate to L3
        const rejectResult = await makeRequest('POST', `/tickets/${ticketId2}/reject`, {
            rejection_reason: 'Cannot handle this request',
            escalate_to_l3: true
        });
        if (rejectResult?.success) {
            console.log('✅ Ticket rejected and escalated to L3');
        } else {
            console.log('❌ Failed to reject ticket');
        }
    }

    // 6. Test escalation flow
    console.log('\n6. Testing escalation flow...');
    const testTicket3 = {
        title: 'Test Escalation Ticket',
        description: 'Testing escalation workflow',
        affected_point_type: 'equipment',
        affected_point_name: 'Test Equipment',
        severity_level: 'high',
        priority: 'urgent'
    };

    const createResult3 = await makeRequest('POST', '/tickets', testTicket3);
    if (createResult3?.success) {
        const ticketId3 = createResult3.data.id;
        console.log(`✅ Third ticket created with ID: ${ticketId3}`);

        // Accept ticket first
        await makeRequest('POST', `/tickets/${ticketId3}/accept`, {
            notes: 'Accepted for escalation testing'
        });

        // Escalate to L3
        const escalateResult = await makeRequest('POST', `/tickets/${ticketId3}/escalate`, {
            escalation_reason: 'Need L3 expertise',
            escalated_to: 1 // Replace with actual L3 user ID
        });
        if (escalateResult?.success) {
            console.log('✅ Ticket escalated successfully');
        } else {
            console.log('❌ Failed to escalate ticket');
        }
    }

    console.log('\n🎉 Workflow testing completed!');
    console.log('\n📋 Summary of tested endpoints:');
    console.log('✅ POST /tickets (create)');
    console.log('✅ POST /tickets/:id/accept');
    console.log('✅ POST /tickets/:id/complete');
    console.log('✅ POST /tickets/:id/close');
    console.log('✅ POST /tickets/:id/reject');
    console.log('✅ POST /tickets/:id/escalate');
};

// Run tests if this file is executed directly
if (require.main === module) {
    if (TEST_TOKEN === 'your_test_jwt_token_here') {
        console.log('⚠️  Please update TEST_TOKEN with a valid JWT token before running tests');
        console.log('💡 You can get a token by logging in through the frontend or using the auth endpoint');
    } else {
        testWorkflow();
    }
}

module.exports = { testWorkflow };
