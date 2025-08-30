const sql = require('mssql');
const dbConfig = require('./src/config/dbConfig');

async function testTicketSystem() {
  try {
    console.log('🔌 Testing database connection...');
    const pool = await sql.connect(dbConfig);
    console.log('✅ Database connection successful');

    // Test if ticket tables exist
    console.log('\n📋 Checking if ticket tables exist...');
    
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('Tickets', 'TicketImages', 'TicketComments', 'TicketStatusHistory', 'TicketAssignments')
      ORDER BY TABLE_NAME
    `);

    if (tablesResult.recordset.length === 0) {
      console.log('❌ No ticket tables found. Please run the SQL script first.');
      console.log('📁 SQL script location: backend/database/ticket_system_tables.sql');
      return;
    }

    console.log('✅ Found ticket tables:');
    tablesResult.recordset.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    // Test basic query on Tickets table
    console.log('\n🔍 Testing basic ticket query...');
    const ticketCount = await pool.request().query('SELECT COUNT(*) as count FROM Tickets');
    console.log(`✅ Tickets table accessible. Current ticket count: ${ticketCount.recordset[0].count}`);

    // Test user table (required for foreign keys)
    console.log('\n👥 Checking users table...');
    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM Users');
    console.log(`✅ Users table accessible. Current user count: ${userCount.recordset[0].count}`);

    console.log('\n🎉 Ticket system database test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Start the frontend: cd ../frontend && npm run dev');
    console.log('   3. Navigate to /tickets in your browser');
    console.log('   4. Create your first ticket!');

  } catch (error) {
    console.error('❌ Error testing ticket system:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Check if SQL Server is running');
    console.log('   2. Verify database connection settings in src/config/dbConfig.js');
    console.log('   3. Ensure the CMMS database exists');
    console.log('   4. Check if the Users table exists (required for foreign keys)');
  } finally {
    await sql.close();
  }
}

// Run the test
testTicketSystem();
