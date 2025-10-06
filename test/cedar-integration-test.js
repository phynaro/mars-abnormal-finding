const axios = require('axios');
const sql = require('mssql');
const dbConfig = require('../backend/src/config/dbConfig');

/**
 * Cedar Integration Test Script
 * Tests the Cedar CMMS integration functionality
 */

const API_BASE_URL = 'http://localhost:3000/api/cedar';

class CedarIntegrationTester {
    constructor() {
        this.pool = null;
        this.testResults = [];
    }

    async initialize() {
        try {
            this.pool = await sql.connect(dbConfig);
            console.log('✅ Database connected for testing');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Cedar Integration Tests\n');
        console.log('=' .repeat(60));

        try {
            // Test 1: Health Check
            await this.testHealthCheck();

            // Test 2: Create Test Ticket
            const testTicketId = await this.testCreateTicket();

            // Test 3: Sync Ticket to Cedar
            await this.testSyncTicketToCedar(testTicketId);

            // Test 4: Get Integration Status
            await this.testGetIntegrationStatus(testTicketId);

            // Test 5: Update Ticket Status
            await this.testUpdateTicketStatus(testTicketId);

            // Test 6: Get Cedar WO Status
            await this.testGetCedarWOStatus(testTicketId);

            // Test 7: Get Integration Logs
            await this.testGetIntegrationLogs(testTicketId);

            // Test 8: Get Statistics
            await this.testGetStatistics();

            // Test 9: Cleanup
            await this.testCleanup(testTicketId);

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        }

        this.printTestSummary();
    }

    async testHealthCheck() {
        console.log('\n1️⃣ Testing Health Check...');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/health`);
            
            if (response.data.success && response.data.data.overall === 'healthy') {
                this.addTestResult('Health Check', 'PASS', 'Cedar integration is healthy');
                console.log('✅ Health Check: PASS');
            } else {
                this.addTestResult('Health Check', 'FAIL', 'Cedar integration is unhealthy');
                console.log('❌ Health Check: FAIL');
            }
        } catch (error) {
            this.addTestResult('Health Check', 'ERROR', error.message);
            console.log('❌ Health Check: ERROR -', error.message);
        }
    }

    async testCreateTicket() {
        console.log('\n2️⃣ Creating Test Ticket...');
        
        try {
            // Create a test ticket directly in the database
            const result = await this.pool.request()
                .input('ticketNumber', sql.VarChar(20), `TEST-${Date.now()}`)
                .input('title', sql.NVarChar(255), 'Cedar Integration Test Ticket')
                .input('description', sql.NVarChar(sql.MAX), 'This is a test ticket for Cedar integration testing')
                .input('puno', sql.Int, 1)
                .input('equipmentId', sql.Int, 1)
                .input('severityLevel', sql.VarChar(20), 'medium')
                .input('priority', sql.VarChar(20), 'normal')
                .input('reportedBy', sql.Int, 1)
                .query(`
                    INSERT INTO Tickets (
                        ticket_number, title, description, puno, equipment_id,
                        severity_level, priority, created_by, status, created_at, updated_at
                    )
                    VALUES (
                        @ticketNumber, @title, @description, @puno, @equipmentId,
                        @severityLevel, @priority, @reportedBy, 'open', GETDATE(), GETDATE()
                    );
                    SELECT SCOPE_IDENTITY() as ticket_id;
                `);

            const ticketId = result.recordset[0].ticket_id;
            this.addTestResult('Create Test Ticket', 'PASS', `Created ticket ID: ${ticketId}`);
            console.log(`✅ Test Ticket Created: ID ${ticketId}`);
            
            return ticketId;
        } catch (error) {
            this.addTestResult('Create Test Ticket', 'ERROR', error.message);
            console.log('❌ Create Test Ticket: ERROR -', error.message);
            throw error;
        }
    }

    async testSyncTicketToCedar(ticketId) {
        console.log('\n3️⃣ Testing Ticket Sync to Cedar...');
        
        try {
            const response = await axios.post(`${API_BASE_URL}/tickets/${ticketId}/sync`, {
                action: 'create',
                actionData: {
                    testMode: true,
                    notes: 'Test sync from integration test'
                }
            });

            if (response.data.success) {
                this.addTestResult('Sync Ticket to Cedar', 'PASS', `WO Created: ${response.data.data.wocode}`);
                console.log(`✅ Ticket Sync: PASS - WO ${response.data.data.wocode} created`);
            } else {
                this.addTestResult('Sync Ticket to Cedar', 'FAIL', response.data.message);
                console.log('❌ Ticket Sync: FAIL -', response.data.message);
            }
        } catch (error) {
            this.addTestResult('Sync Ticket to Cedar', 'ERROR', error.response?.data?.message || error.message);
            console.log('❌ Ticket Sync: ERROR -', error.response?.data?.message || error.message);
        }
    }

    async testGetIntegrationStatus(ticketId) {
        console.log('\n4️⃣ Testing Get Integration Status...');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/tickets/${ticketId}/status`);

            if (response.data.success) {
                const integration = response.data.data.cedarIntegration;
                this.addTestResult('Get Integration Status', 'PASS', `Status: ${integration.syncStatus}, WO: ${integration.wocode}`);
                console.log(`✅ Integration Status: PASS - ${integration.syncStatus}, WO: ${integration.wocode}`);
            } else {
                this.addTestResult('Get Integration Status', 'FAIL', response.data.message);
                console.log('❌ Integration Status: FAIL -', response.data.message);
            }
        } catch (error) {
            this.addTestResult('Get Integration Status', 'ERROR', error.response?.data?.message || error.message);
            console.log('❌ Integration Status: ERROR -', error.response?.data?.message || error.message);
        }
    }

    async testUpdateTicketStatus(ticketId) {
        console.log('\n5️⃣ Testing Update Ticket Status...');
        
        try {
            // First, update the ticket status in the database
            await this.pool.request()
                .input('ticketId', sql.Int, ticketId)
                .input('newStatus', sql.VarChar(50), 'in_progress')
                .input('assignedTo', sql.Int, 1)
                .input('acceptedBy', sql.Int, 1)
                .query(`
                    UPDATE Tickets 
                    SET status = @newStatus, 
                        assigned_to = @assignedTo,
                        accepted_by = @acceptedBy,
                        accepted_at = GETDATE(),
                        updated_at = GETDATE()
                    WHERE id = @ticketId
                `);

            // Then sync to Cedar
            const response = await axios.post(`${API_BASE_URL}/tickets/${ticketId}/sync`, {
                action: 'accept',
                actionData: {
                    newStatus: 'in_progress',
                    changedBy: 1,
                    notes: 'Test status update'
                }
            });

            if (response.data.success) {
                this.addTestResult('Update Ticket Status', 'PASS', 'Status updated and synced to Cedar');
                console.log('✅ Update Ticket Status: PASS');
            } else {
                this.addTestResult('Update Ticket Status', 'FAIL', response.data.message);
                console.log('❌ Update Ticket Status: FAIL -', response.data.message);
            }
        } catch (error) {
            this.addTestResult('Update Ticket Status', 'ERROR', error.response?.data?.message || error.message);
            console.log('❌ Update Ticket Status: ERROR -', error.response?.data?.message || error.message);
        }
    }

    async testGetCedarWOStatus(ticketId) {
        console.log('\n6️⃣ Testing Get Cedar WO Status...');
        
        try {
            // First get the Cedar WO number from the ticket
            const ticketResult = await this.pool.request()
                .input('ticketId', sql.Int, ticketId)
                .query('SELECT cedar_wono FROM Tickets WHERE id = @ticketId');

            const wono = ticketResult.recordset[0]?.cedar_wono;
            
            if (!wono) {
                this.addTestResult('Get Cedar WO Status', 'SKIP', 'No Cedar WO found for ticket');
                console.log('⚠️ Get Cedar WO Status: SKIP - No Cedar WO found');
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/work-orders/${wono}/status`);

            if (response.data.success) {
                const wo = response.data.data;
                this.addTestResult('Get Cedar WO Status', 'PASS', `WO ${wo.wocode} - Status: ${wo.woStatusNo}`);
                console.log(`✅ Get Cedar WO Status: PASS - WO ${wo.wocode} - Status: ${wo.woStatusNo}`);
            } else {
                this.addTestResult('Get Cedar WO Status', 'FAIL', response.data.message);
                console.log('❌ Get Cedar WO Status: FAIL -', response.data.message);
            }
        } catch (error) {
            this.addTestResult('Get Cedar WO Status', 'ERROR', error.response?.data?.message || error.message);
            console.log('❌ Get Cedar WO Status: ERROR -', error.response?.data?.message || error.message);
        }
    }

    async testGetIntegrationLogs(ticketId) {
        console.log('\n7️⃣ Testing Get Integration Logs...');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/tickets/${ticketId}/logs`);

            if (response.data.success) {
                const logs = response.data.data;
                this.addTestResult('Get Integration Logs', 'PASS', `Found ${logs.length} log entries`);
                console.log(`✅ Get Integration Logs: PASS - Found ${logs.length} log entries`);
            } else {
                this.addTestResult('Get Integration Logs', 'FAIL', response.data.message);
                console.log('❌ Get Integration Logs: FAIL -', response.data.message);
            }
        } catch (error) {
            this.addTestResult('Get Integration Logs', 'ERROR', error.response?.data?.message || error.message);
            console.log('❌ Get Integration Logs: ERROR -', error.response?.data?.message || error.message);
        }
    }

    async testGetStatistics() {
        console.log('\n8️⃣ Testing Get Statistics...');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/statistics`);

            if (response.data.success) {
                const stats = response.data.data.overview;
                this.addTestResult('Get Statistics', 'PASS', `Total: ${stats.total_tickets}, Success: ${stats.successful_syncs}`);
                console.log(`✅ Get Statistics: PASS - Total: ${stats.total_tickets}, Success: ${stats.successful_syncs}`);
            } else {
                this.addTestResult('Get Statistics', 'FAIL', response.data.message);
                console.log('❌ Get Statistics: FAIL -', response.data.message);
            }
        } catch (error) {
            this.addTestResult('Get Statistics', 'ERROR', error.response?.data?.message || error.message);
            console.log('❌ Get Statistics: ERROR -', error.response?.data?.message || error.message);
        }
    }

    async testCleanup(ticketId) {
        console.log('\n9️⃣ Cleaning up test data...');
        
        try {
            // Delete the test ticket and related data
            await this.pool.request()
                .input('ticketId', sql.Int, ticketId)
                .query(`
                    DELETE FROM CedarIntegrationLog WHERE ticket_id = @ticketId;
                    DELETE FROM Tickets WHERE id = @ticketId;
                `);

            this.addTestResult('Cleanup', 'PASS', 'Test data cleaned up');
            console.log('✅ Cleanup: PASS - Test data cleaned up');
        } catch (error) {
            this.addTestResult('Cleanup', 'ERROR', error.message);
            console.log('❌ Cleanup: ERROR -', error.message);
        }
    }

    addTestResult(testName, status, message) {
        this.testResults.push({
            test: testName,
            status: status,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    printTestSummary() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('=' .repeat(60));

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const errors = this.testResults.filter(r => r.status === 'ERROR').length;
        const skipped = this.testResults.filter(r => r.status === 'SKIP').length;

        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`💥 Errors: ${errors}`);
        console.log(`⚠️ Skipped: ${skipped}`);
        console.log(`📊 Total: ${this.testResults.length}`);

        console.log('\n📋 Detailed Results:');
        this.testResults.forEach((result, index) => {
            const statusIcon = {
                'PASS': '✅',
                'FAIL': '❌',
                'ERROR': '💥',
                'SKIP': '⚠️'
            }[result.status] || '❓';

            console.log(`${index + 1}. ${statusIcon} ${result.test}: ${result.status} - ${result.message}`);
        });

        console.log('\n' + '=' .repeat(60));
        
        if (failed === 0 && errors === 0) {
            console.log('🎉 ALL TESTS PASSED! Cedar integration is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Please review the results above.');
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.close();
            console.log('✅ Database connection closed');
        }
    }
}

// Run the tests
async function runTests() {
    const tester = new CedarIntegrationTester();
    
    try {
        await tester.initialize();
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    } finally {
        await tester.close();
    }
}

// Execute tests if this file is run directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = CedarIntegrationTester;
