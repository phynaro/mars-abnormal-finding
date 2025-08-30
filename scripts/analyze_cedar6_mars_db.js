#!/usr/bin/env node
// Comprehensive analysis of Cedar6_Mars database structure and features

const path = require('path');
const fs = require('fs');

// Load environment configuration
try {
  require('dotenv').config();
} catch {}
try {
  const envPath = path.join(__dirname, '..', 'mssql-mcp-node', '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
} catch {}

// Load config from .cursor/mcp.json
try {
  const cursorCfgPath = path.join(__dirname, '..', '.cursor', 'mcp.json');
  if (fs.existsSync(cursorCfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cursorCfgPath, 'utf8'));
    const servers = cfg.mcpServers || cfg.servers || {};
    const entries = Object.entries(servers);
    for (const [key, val] of entries) {
      const command = String(val?.command || '');
      const args = (val?.args || []).map(String);
      const looksLikeMSSQLMcp =
        command.includes('mssql-mcp-node') || args.some((a) => a.includes('mssql-mcp-node'));
      if (looksLikeMSSQLMcp) {
        const env = val.env || {};
        for (const [k, v] of Object.entries(env)) {
          if (!process.env[k]) process.env[k] = String(v);
        }
      }
    }
  }
} catch {}

async function main() {
  const { executeSql } = require('../mssql-mcp-node/src/modules/tools');

  console.log('=== Cedar6_Mars Database Analysis ===\n');

  // 1. Get database information
  console.log('1. Database Information:');
  const dbInfoQuery = `
    SELECT 
      DB_NAME() AS DatabaseName,
      DATABASEPROPERTYEX(DB_NAME(), 'Status') AS Status,
      DATABASEPROPERTYEX(DB_NAME(), 'Recovery') AS RecoveryModel,
      DATABASEPROPERTYEX(DB_NAME(), 'UserAccess') AS UserAccess,
      DATABASEPROPERTYEX(DB_NAME(), 'IsReadOnly') AS IsReadOnly
  `;
  
  const dbInfo = await executeSql(dbInfoQuery);
  if (dbInfo && dbInfo.content && dbInfo.content[0]) {
    try {
      const info = JSON.parse(dbInfo.content[0].text);
      if (info.recordset && info.recordset.length > 0) {
        const db = info.recordset[0];
        console.log(`   Database Name: ${db.DatabaseName}`);
        console.log(`   Status: ${db.Status}`);
        console.log(`   Recovery Model: ${db.RecoveryModel}`);
        console.log(`   User Access: ${db.UserAccess}`);
        console.log(`   Read Only: ${db.IsReadOnly}`);
      }
    } catch (e) {
      console.log('   Could not parse database info');
    }
  }

  // 2. Analyze table categories
  console.log('\n2. Table Categories Analysis:');
  
  const categoryQueries = [
    {
      name: 'System Tables',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE '_syst%' OR t.name LIKE '_sec%'`
    },
    {
      name: 'Equipment Management',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'EQ%' OR t.name LIKE 'PU%' OR t.name LIKE 'PM%'`
    },
    {
      name: 'Work Orders',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'WO%' OR t.name LIKE 'WR%'`
    },
    {
      name: 'Inventory Management',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'IV%' OR t.name LIKE 'Iv%'`
    },
    {
      name: 'Budget & Financial',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'Budget%' OR t.name LIKE 'Account%'`
    },
    {
      name: 'Personnel Management',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'Person%' OR t.name LIKE 'Crew%' OR t.name LIKE 'Craft%'`
    },
    {
      name: 'Workflow & Approvals',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'WF%' OR t.name LIKE 'WFA%'`
    },
    {
      name: 'Reports & Analytics',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'Report%' OR t.name LIKE 'Cube%' OR t.name LIKE 'KPI%'`
    },
    {
      name: 'Mobile & Integration',
      query: `SELECT COUNT(*) as count FROM sys.tables t 
              JOIN sys.schemas s ON t.schema_id = s.schema_id 
              WHERE t.name LIKE 'Mobile%' OR t.name LIKE 'Inte%'`
    }
  ];

  for (const category of categoryQueries) {
    const result = await executeSql(category.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${category.name}: ${data.recordset[0].count} tables`);
        }
      } catch (e) {
        console.log(`   ${category.name}: Error parsing result`);
      }
    }
  }

  // 3. Get key table details
  console.log('\n3. Key Tables Analysis:');
  
  const keyTables = [
    'EQ', 'PU', 'WO', 'WR', 'Person', 'IV_Catalog', 'Budget_Head', 
    'PM', 'WF', 'Report', 'MobileConfig', 'Dashboard'
  ];

  for (const table of keyTables) {
    const schemaQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${table}'
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await executeSql(schemaQuery);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${table}: ${data.recordset.length} columns`);
          // Show first few columns as examples
          const sampleColumns = data.recordset.slice(0, 3).map(col => 
            `${col.COLUMN_NAME} (${col.DATA_TYPE})`
          ).join(', ');
          console.log(`     Sample columns: ${sampleColumns}${data.recordset.length > 3 ? '...' : ''}`);
        }
      } catch (e) {
        console.log(`   ${table}: Error parsing schema`);
      }
    }
  }

  // 4. Analyze stored procedures
  console.log('\n4. Stored Procedures Analysis:');
  const spQuery = `
    SELECT COUNT(*) as count 
    FROM sys.procedures 
    WHERE type = 'P'
  `;
  
  const spResult = await executeSql(spQuery);
  if (spResult && spResult.content && spResult.content[0]) {
    try {
      const data = JSON.parse(spResult.content[0].text);
      if (data.recordset && data.recordset.length > 0) {
        console.log(`   Total Stored Procedures: ${data.recordset[0].count}`);
      }
    } catch (e) {
      console.log('   Could not parse stored procedure count');
    }
  }

  // 5. Analyze views
  console.log('\n5. Views Analysis:');
  const viewQuery = `
    SELECT COUNT(*) as count 
    FROM sys.views
  `;
  
  const viewResult = await executeSql(viewQuery);
  if (viewResult && viewResult.content && viewResult.content[0]) {
    try {
      const data = JSON.parse(viewResult.content[0].text);
      if (data.recordset && data.recordset.length > 0) {
        console.log(`   Total Views: ${data.recordset[0].count}`);
      }
    } catch (e) {
      console.log('   Could not parse view count');
    }
  }

  // 6. Check for foreign key relationships
  console.log('\n6. Database Relationships:');
  const fkQuery = `
    SELECT COUNT(*) as count 
    FROM sys.foreign_keys
  `;
  
  const fkResult = await executeSql(fkQuery);
  if (fkResult && fkResult.content && fkResult.content[0]) {
    try {
      const data = JSON.parse(fkResult.content[0].text);
      if (data.recordset && data.recordset.length > 0) {
        console.log(`   Foreign Key Relationships: ${data.recordset[0].count}`);
      }
    } catch (e) {
      console.log('   Could not parse foreign key count');
    }
  }

  // 7. Check for indexes
  console.log('\n7. Index Analysis:');
  const indexQuery = `
    SELECT COUNT(*) as count 
    FROM sys.indexes 
    WHERE type > 0
  `;
  
  const indexResult = await executeSql(indexQuery);
  if (indexResult && indexResult.content && indexResult.content[0]) {
    try {
      const data = JSON.parse(indexResult.content[0].text);
      if (data.recordset && data.recordset.length > 0) {
        console.log(`   Total Indexes: ${data.recordset[0].count}`);
      }
    } catch (e) {
      console.log('   Could not parse index count');
    }
  }

  console.log('\n=== Analysis Complete ===');
}

main().catch((e) => {
  console.error('Failed to analyze database:', e.message);
  process.exit(1);
});
