#!/usr/bin/env node
// Detailed feature analysis of Cedar6_Mars database

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

  console.log('=== Cedar6_Mars Detailed Feature Analysis ===\n');

  // 1. Equipment Management Features
  console.log('1. Equipment Management Features:');
  const eqFeatures = [
    { name: 'Equipment Types', query: 'SELECT COUNT(*) as count FROM EQType' },
    { name: 'Equipment Groups', query: 'SELECT COUNT(*) as count FROM EQGroup' },
    { name: 'Equipment Status Types', query: 'SELECT COUNT(*) as count FROM EQStatus' },
    { name: 'Equipment Criticality Levels', query: 'SELECT COUNT(*) as count FROM EQCritical' },
    { name: 'Equipment Components', query: 'SELECT COUNT(*) as count FROM EQ_Comp' },
    { name: 'Equipment Failures', query: 'SELECT COUNT(*) as count FROM EQ_Failures' },
    { name: 'Equipment Attachments', query: 'SELECT COUNT(*) as count FROM EQ_Attach' }
  ];

  for (const feature of eqFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 2. Work Order Management Features
  console.log('\n2. Work Order Management Features:');
  const woFeatures = [
    { name: 'Work Order Types', query: 'SELECT COUNT(*) as count FROM WOType' },
    { name: 'Work Order Status Types', query: 'SELECT COUNT(*) as count FROM WOStatus' },
    { name: 'Work Order Priorities', query: 'SELECT COUNT(*) as count FROM WOPriority' },
    { name: 'Work Order Problems', query: 'SELECT COUNT(*) as count FROM WOProblem' },
    { name: 'Work Order Actions', query: 'SELECT COUNT(*) as count FROM WOAction' },
    { name: 'Work Order Causes', query: 'SELECT COUNT(*) as count FROM WOCause' },
    { name: 'Work Order Tasks', query: 'SELECT COUNT(*) as count FROM WO_Task' },
    { name: 'Work Order Resources', query: 'SELECT COUNT(*) as count FROM WO_Resource' }
  ];

  for (const feature of woFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 3. Inventory Management Features
  console.log('\n3. Inventory Management Features:');
  const ivFeatures = [
    { name: 'Inventory Parts', query: 'SELECT COUNT(*) as count FROM IvPart' },
    { name: 'Inventory Stores', query: 'SELECT COUNT(*) as count FROM Iv_Store' },
    { name: 'Inventory Vendors', query: 'SELECT COUNT(*) as count FROM IV_Vendor' },
    { name: 'Inventory Transactions', query: 'SELECT COUNT(*) as count FROM IV_TRHead' },
    { name: 'Inventory Units', query: 'SELECT COUNT(*) as count FROM IVUnit' },
    { name: 'Inventory Groups', query: 'SELECT COUNT(*) as count FROM IVGroup' }
  ];

  for (const feature of ivFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 4. Preventive Maintenance Features
  console.log('\n4. Preventive Maintenance Features:');
  const pmFeatures = [
    { name: 'PM Schedules', query: 'SELECT COUNT(*) as count FROM PMSched' },
    { name: 'PM Tasks', query: 'SELECT COUNT(*) as count FROM PM_Task' },
    { name: 'PM Resources', query: 'SELECT COUNT(*) as count FROM PM_Resource' },
    { name: 'PM Meters', query: 'SELECT COUNT(*) as count FROM PM_Meter' },
    { name: 'PM Inspections', query: 'SELECT COUNT(*) as count FROM PM_Inspec' },
    { name: 'PM Groups', query: 'SELECT COUNT(*) as count FROM PM_GROUP' }
  ];

  for (const feature of pmFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 5. Personnel Management Features
  console.log('\n5. Personnel Management Features:');
  const personFeatures = [
    { name: 'Personnel Records', query: 'SELECT COUNT(*) as count FROM Person' },
    { name: 'Crews', query: 'SELECT COUNT(*) as count FROM Crew' },
    { name: 'Crafts', query: 'SELECT COUNT(*) as count FROM Craft' },
    { name: 'Personnel Access', query: 'SELECT COUNT(*) as count FROM PersonAccess' },
    { name: 'Personnel Training', query: 'SELECT COUNT(*) as count FROM Person_Train' },
    { name: 'Personnel Time Sheets', query: 'SELECT COUNT(*) as count FROM PersonTimeSheet' }
  ];

  for (const feature of personFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 6. Workflow & Approval Features
  console.log('\n6. Workflow & Approval Features:');
  const wfFeatures = [
    { name: 'Workflow Types', query: 'SELECT COUNT(*) as count FROM WFTypes' },
    { name: 'Workflow Nodes', query: 'SELECT COUNT(*) as count FROM WF_NODE' },
    { name: 'Workflow Approvers', query: 'SELECT COUNT(*) as count FROM WFApprovers' },
    { name: 'Workflow Routing', query: 'SELECT COUNT(*) as count FROM WFRouting' },
    { name: 'Workflow Tracked Items', query: 'SELECT COUNT(*) as count FROM WFTrackeds' }
  ];

  for (const feature of wfFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 7. Mobile & Integration Features
  console.log('\n7. Mobile & Integration Features:');
  const mobileFeatures = [
    { name: 'Mobile Configurations', query: 'SELECT COUNT(*) as count FROM MobileConfig' },
    { name: 'Mobile Forms', query: 'SELECT COUNT(*) as count FROM MobileForm' },
    { name: 'Mobile Notifications', query: 'SELECT COUNT(*) as count FROM mobile_notify' },
    { name: 'Integration Interfaces', query: 'SELECT COUNT(*) as count FROM Inte_Interface' },
    { name: 'Integration Files', query: 'SELECT COUNT(*) as count FROM Inte_File' },
    { name: 'Integration Stored Procedures', query: 'SELECT COUNT(*) as count FROM Inte_StoredProcedure' }
  ];

  for (const feature of mobileFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 8. Reporting & Analytics Features
  console.log('\n8. Reporting & Analytics Features:');
  const reportFeatures = [
    { name: 'Reports', query: 'SELECT COUNT(*) as count FROM Report' },
    { name: 'Report Screens', query: 'SELECT COUNT(*) as count FROM Report_Screens' },
    { name: 'Report Tables', query: 'SELECT COUNT(*) as count FROM Report_Tables' },
    { name: 'KPIs', query: 'SELECT COUNT(*) as count FROM KPI' },
    { name: 'Dashboard Configurations', query: 'SELECT COUNT(*) as count FROM Dashboard' },
    { name: 'Cube Data (Uptime)', query: 'SELECT COUNT(*) as count FROM CubeUptime' },
    { name: 'Cube Data (Costs)', query: 'SELECT COUNT(*) as count FROM CubeCosts' },
    { name: 'Cube Data (Loss)', query: 'SELECT COUNT(*) as count FROM CubeLoss' }
  ];

  for (const feature of reportFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 9. Budget & Financial Features
  console.log('\n9. Budget & Financial Features:');
  const budgetFeatures = [
    { name: 'Budget Heads', query: 'SELECT COUNT(*) as count FROM Budget_Head' },
    { name: 'Budget Groups', query: 'SELECT COUNT(*) as count FROM BudgetGroup' },
    { name: 'Budget Periods', query: 'SELECT COUNT(*) as count FROM Budget_Periods' },
    { name: 'Budget Parameters', query: 'SELECT COUNT(*) as count FROM Budget_Parameters' },
    { name: 'Cost Centers', query: 'SELECT COUNT(*) as count FROM CostCenter' },
    { name: 'Accounts', query: 'SELECT COUNT(*) as count FROM Account' }
  ];

  for (const feature of budgetFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  // 10. System Configuration Features
  console.log('\n10. System Configuration Features:');
  const sysFeatures = [
    { name: 'System Configurations', query: 'SELECT COUNT(*) as count FROM _systConfig' },
    { name: 'System Forms', query: 'SELECT COUNT(*) as count FROM _systForms' },
    { name: 'System Menus', query: 'SELECT COUNT(*) as count FROM _systMenus' },
    { name: 'System Languages', query: 'SELECT COUNT(*) as count FROM _systLanguages' },
    { name: 'System Error Messages', query: 'SELECT COUNT(*) as count FROM _systErrorMessages' },
    { name: 'Security Users', query: 'SELECT COUNT(*) as count FROM _secUsers' },
    { name: 'Security User Groups', query: 'SELECT COUNT(*) as count FROM _secUserGroups' }
  ];

  for (const feature of sysFeatures) {
    const result = await executeSql(feature.query);
    if (result && result.content && result.content[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        if (data.recordset && data.recordset.length > 0) {
          console.log(`   ${feature.name}: ${data.recordset[0].count} records`);
        }
      } catch (e) {
        console.log(`   ${feature.name}: Error parsing result`);
      }
    }
  }

  console.log('\n=== Detailed Feature Analysis Finish ===');
}

main().catch((e) => {
  console.error('Failed to analyze features:', e.message);
  process.exit(1);
});
