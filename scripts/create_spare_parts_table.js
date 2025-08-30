#!/usr/bin/env node
// Creates dbo.SpareParts table and inserts mock data using the MCP execute_sql tool.
// Loads env from project root, mssql-mcp-node/.env, or .cursor/mcp.json.

const path = require('path');
const fs = require('fs');

function loadEnv() {
  try { require('dotenv').config(); } catch {}
  try {
    const envPath = path.join(__dirname, '..', 'mssql-mcp-node', '.env');
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  } catch {}
  try {
    const cursorCfgPath = path.join(__dirname, '..', '.cursor', 'mcp.json');
    if (fs.existsSync(cursorCfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cursorCfgPath, 'utf8'));
      const servers = cfg.mcpServers || cfg.servers || {};
      for (const [key, val] of Object.entries(servers)) {
        const command = String(val?.command || '');
        const args = (val?.args || []).map(String);
        const looksLike = command.includes('mssql-mcp-node') || args.some((a) => a.includes('mssql-mcp-node'));
        if (looksLike) {
          const env = val.env || {};
          for (const [k, v] of Object.entries(env)) {
            if (!process.env[k]) process.env[k] = String(v);
          }
        }
      }
    }
  } catch {}
}

async function run() {
  loadEnv();
  const { executeSql } = require('../mssql-mcp-node/src/modules/tools');

  const dbKey = process.argv[2]; // optional

  const createTableSql = `
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE t.name = 'SpareParts' AND s.name = 'dbo'
)
BEGIN
  CREATE TABLE dbo.SpareParts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    part_number NVARCHAR(100) NOT NULL,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000) NULL,
    unit_of_measure NVARCHAR(50) NOT NULL DEFAULT 'EA',
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
    location NVARCHAR(100) NULL,
    supplier NVARCHAR(200) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END`;

  const insertMockSql = `
IF NOT EXISTS (SELECT 1 FROM dbo.SpareParts)
BEGIN
  INSERT INTO dbo.SpareParts
  (part_number, name, description, unit_of_measure, quantity_on_hand, reorder_point, unit_cost, location, supplier)
  VALUES
  ('SP-0001','Bearing 6204-2RS','Sealed ball bearing','EA',120,40,3.25,'Aisle 1 - Bin B3','SKF'),
  ('SP-0002','Drive Belt A42','Rubber V-belt 1/2in x 44in','EA',35,10,7.80,'Aisle 2 - Bin A1','Gates'),
  ('SP-0003','Oil Seal 25x47x7','Nitrile oil seal','EA',60,20,1.95,'Aisle 1 - Bin C2','NOK'),
  ('SP-0004','Proximity Sensor M12','Inductive proximity sensor, NPN','EA',15,5,22.50,'Aisle 3 - Shelf 2','Omron'),
  ('SP-0005','Solenoid Valve 24VDC','2/2 way NC, 1/4" ports','EA',10,4,38.00,'Aisle 3 - Shelf 4','SMC'),
  ('SP-0006','Coupling Jaw L-095','Jaw coupling element','EA',25,8,4.75,'Aisle 2 - Bin D1','Lovejoy'),
  ('SP-0007','Chain #40 10ft','ANSI roller chain','EA',5,2,29.90,'Aisle 4 - Rack 1','Tsubaki'),
  ('SP-0008','Fuse 10A Slow-Blow','5x20mm time-delay fuse','EA',200,50,0.35,'Aisle 1 - Bin A5','Littelfuse'),
  ('SP-0009','Hydraulic Hose 3/8"','2-wire 3/8" x 48" hose','EA',8,3,18.40,'Aisle 5 - Hook 7','Parker'),
  ('SP-0010','Grease NLGI-2','Lithium complex grease 400g','TUBE',40,15,2.80,'Aisle 6 - Chem Shelf','Shell');
END`;

  const selectPreview = `SELECT TOP 10 * FROM dbo.SpareParts ORDER BY id`;

  // Create table
  const res1 = await executeSql(createTableSql, dbKey);
  console.log('Create table:', res1?.content?.[0]?.text || 'done');

  // Insert mock data if empty
  const res2 = await executeSql(insertMockSql, dbKey);
  console.log('Insert mock:', res2?.content?.[0]?.text || 'done');

  // Preview
  const res3 = await executeSql(selectPreview, dbKey);
  const payload = res3?.content?.[0]?.text;
  try {
    const obj = JSON.parse(payload);
    console.log('Preview rows:', obj.rowCount);
    console.table(obj.recordset);
  } catch {
    console.log(payload);
  }
}

run().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});

