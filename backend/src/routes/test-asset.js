const express = require('express');
const router = express.Router();
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Helper function to get database connection
async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

// Test endpoint without authentication
router.get('/test-sites', async (req, res) => {
  try {
    console.log('Testing sites endpoint...');
    const pool = await getConnection();
    
    const result = await pool.request()
      .query(`
        SELECT SiteNo, SiteCode, SiteName, LogoPath, MaxNumOfUserLicense
        FROM [Site] 
        WHERE FlagDel = 'F'
        ORDER BY SiteName
      `);

    console.log('Query successful, found', result.recordset.length, 'sites');
    
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('Test sites error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test endpoint to check database connection
router.get('/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    console.log('DB Config:', {
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user
    });
    
    const pool = await getConnection();
    const result = await pool.request().query('SELECT @@VERSION as Version, DB_NAME() as CurrentDatabase');
    
    console.log('Database connection successful');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      version: result.recordset[0].Version,
      currentDatabase: result.recordset[0].CurrentDatabase
    });

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
