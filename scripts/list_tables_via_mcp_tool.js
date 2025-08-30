#!/usr/bin/env node
// Lists tables using the MCP server's execute_sql tool implementation.
// It loads env from mssql-mcp-node/.env if present, then calls executeSql.

const path = require('path');
const fs = require('fs');

// Try to load dotenv from project root and mssql-mcp-node
try {
  require('dotenv').config();
} catch {}
try {
  const envPath = path.join(__dirname, '..', 'mssql-mcp-node', '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
} catch {}

// Attempt to load env from .cursor/mcp.json if present
try {
  const cursorCfgPath = path.join(__dirname, '..', '.cursor', 'mcp.json');
  if (fs.existsSync(cursorCfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cursorCfgPath, 'utf8'));
    const servers = cfg.mcpServers || cfg.servers || {};
    // Prefer any server whose command references mssql-mcp-node
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

  // Accept optional dbKey as first arg
  const dbKey = process.argv[2];
  // Use sys.tables + sys.schemas to avoid MCP special-casing of INFORMATION_SCHEMA.TABLES
  const query = `SELECT s.name AS TABLE_SCHEMA, t.name AS TABLE_NAME FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id ORDER BY s.name, t.name`;

  const res = await executeSql(query, dbKey);

  // The tool returns { content: [{ type: 'text', text: json }], isError }
  if (!res || !Array.isArray(res.content) || res.content.length === 0) {
    console.error('Unexpected response from execute_sql tool:', res);
    process.exit(2);
  }

  const payload = res.content[0]?.text;
  try {
    const obj = JSON.parse(payload);
    if (obj.tables) {
      console.log(`Database: ${obj.db}`);
      console.log('Tables:');
      obj.tables.forEach((t) => console.log(`- ${t}`));
      console.log(`Total: ${obj.rowCount}`);
    } else if (obj.recordset) {
      console.log(`Database: ${obj.db}`);
      console.log('Tables:');
      obj.recordset.forEach((row) => {
        const schema = row.TABLE_SCHEMA || row.schema || '';
        const name = row.TABLE_NAME || row.name || '';
        if (schema && name) console.log(`- ${schema}.${name}`);
        else console.log(`- ${JSON.stringify(row)}`);
      });
      console.log(`Total: ${obj.rowCount}`);
    } else if (obj.error) {
      console.error('Error:', obj.error);
      process.exit(1);
    } else {
      console.log(payload);
    }
  } catch {
    console.log(payload);
  }
}

main().catch((e) => {
  console.error('Failed to list tables:', e.message);
  process.exit(1);
});
