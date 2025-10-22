const sql = require('mssql');
const dbConfig = require('./src/config/database');

async function testDuplicateKeys() {
    try {
        const pool = await sql.connect(dbConfig);
        
        console.log('Testing DP plant areas...');
        
        // Test the old query (should show duplicates)
        console.log('\n--- OLD QUERY (with duplicates) ---');
        const oldResult = await pool.request()
            .input('plant', sql.NVarChar(50), 'DP')
            .query(`
                SELECT DISTINCT 
                    area as code,
                    pudescription as name
                FROM PUExtension
                WHERE plant = @plant
                AND area IS NOT NULL 
                AND area != ''
                AND digit_count = 2
                ORDER BY area
            `);
        
        console.log('Results:', oldResult.recordset);
        
        // Test the new query (should eliminate duplicates)
        console.log('\n--- NEW QUERY (no duplicates) ---');
        const newResult = await pool.request()
            .input('plant', sql.NVarChar(50), 'DP')
            .query(`
                SELECT 
                    area as code,
                    MIN(pudescription) as name
                FROM PUExtension
                WHERE plant = @plant
                AND area IS NOT NULL 
                AND area != ''
                AND digit_count = 2
                GROUP BY area
                ORDER BY area
            `);
        
        console.log('Results:', newResult.recordset);
        
        await pool.close();
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testDuplicateKeys();
