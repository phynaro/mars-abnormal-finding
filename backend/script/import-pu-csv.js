#!/usr/bin/env node
/**
 * Securely import PU rows from a CSV file into dbo.PU.
 *
 * Safety features:
 * - Dry run by default; use --apply to commit inserts
 * - Parses standard CSV quotes correctly
 * - Uses a temp staging table before touching dbo.PU
 * - Validates duplicate PUNO values, parent references, and string lengths
 * - Inserts only missing PUNO rows
 *
 * Usage:
 *   node script/import-pu-csv.js script/updated_pu.csv
 *   node script/import-pu-csv.js script/updated_pu.csv --apply
 *   node script/import-pu-csv.js script/updated_pu.csv --apply --rebuild-extension
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const dbConfig = require('../src/config/dbConfig');

const TARGET_TABLE = 'dbo.PU';
const STAGE_TABLE_NAME = `IgxPUImportStage_${process.pid}_${Date.now()}`;
const STAGE_TABLE = `[dbo].[${STAGE_TABLE_NAME}]`;

const COLUMN_SPECS = [
  { target: 'PUNO', type: 'int', required: true },
  { target: 'PUCODE', type: 'nvarchar', maxLength: 30, required: true },
  { target: 'PUNAME', type: 'nvarchar', maxLength: 100, required: true },
  { target: 'PUPARENT', type: 'int' },
  { target: 'PUREFCODE', type: 'nvarchar', maxLength: 50 },
  { target: 'DEPTNO', type: 'int' },
  { target: 'COSTCENTERNO', type: 'int' },
  { target: 'PUTYPENO', type: 'int' },
  { target: 'PUSTATUSNO', type: 'int' },
  { target: 'PUCRITICALNO', type: 'int' },
  { target: 'PULOCTYPENO', type: 'int' },
  { target: 'PULOCATION', type: 'nvarchar', maxLength: 50 },
  { target: 'NOTE', type: 'nvarchar' },
  { target: 'FLAGDEL', type: 'varchar', maxLength: 1 },
  { target: 'HIERARCHYNO', type: 'nvarchar', maxLength: 100 },
  { target: 'CHILDMAX', type: 'nvarchar', maxLength: 7 },
  { target: 'CURR_LEVEL', type: 'int' },
  { target: 'BudgetCalc_Flag', type: 'varchar', maxLength: 1 },
  { target: 'TEXT1', type: 'nvarchar', maxLength: 100 },
  { target: 'TEXT2', type: 'nvarchar', maxLength: 100 },
  { target: 'TEXT3', type: 'nvarchar', maxLength: 200 },
  { target: 'NUMBER1', type: 'float' },
  { target: 'NUMBER2', type: 'float' },
  { target: 'DATE1', type: 'nvarchar', maxLength: 8 },
  { target: 'DATE2', type: 'nvarchar', maxLength: 8 },
  { target: 'LOGIC1', type: 'varchar', maxLength: 1 },
  { target: 'LOGIC2', type: 'varchar', maxLength: 1 },
  { target: 'UPDATEUSER', type: 'int' },
  { target: 'UPDATEDATE', type: 'nvarchar', maxLength: 8 },
  { target: 'PU_DTCost', type: 'float' },
];

const OMITTED_TARGET_COLUMNS = [
  'CREATEUSER',
  'CREATEDATE',
  'SiteNo',
  'IMG',
  'ClosedDate',
  'Person_Email',
  'PUGROUPNO',
  'DEPT_OWN',
  'FLEETDRIVER',
  'LATITUDE',
  'LONGITUDE',
  'NOTE2',
  'PHONE',
  'TEXT4',
  'TEXT5',
  'TEXT6',
  'TEXT7',
  'pucode2',
];

const HEADER_ALIASES = new Map(
  COLUMN_SPECS.map((spec) => [normalizeHeader(spec.target), spec.target])
);

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function parseArgs(argv) {
  const flags = new Set(argv.slice(2).filter((arg) => arg.startsWith('--')));
  const fileArg = argv.slice(2).find((arg) => !arg.startsWith('--'));

  return {
    csvPath: fileArg || 'script/updated_pu.csv',
    apply: flags.has('--apply'),
    rebuildExtension: flags.has('--rebuild-extension'),
  };
}

function parseCSV(content) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current);
      if (row.some((cell) => String(cell).trim() !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => String(cell).trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function cleanRawValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase() === 'NULL') return null;
  return trimmed;
}

function convertValue(rawValue, spec) {
  const cleaned = cleanRawValue(rawValue);
  if (cleaned === null) return null;

  if (spec.type === 'int') {
    const parsed = Number.parseInt(cleaned, 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`expected integer for ${spec.target}, got "${rawValue}"`);
    }
    return parsed;
  }

  if (spec.type === 'float') {
    const parsed = Number.parseFloat(cleaned);
    if (Number.isNaN(parsed)) {
      throw new Error(`expected number for ${spec.target}, got "${rawValue}"`);
    }
    return parsed;
  }

  if (spec.maxLength && cleaned.length > spec.maxLength) {
    throw new Error(
      `${spec.target} length ${cleaned.length} exceeds max ${spec.maxLength}`
    );
  }

  return cleaned;
}

function buildHeaderMap(headers) {
  const headerMap = new Map();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const target = HEADER_ALIASES.get(normalized);
    if (target && !headerMap.has(target)) {
      headerMap.set(target, index);
    }
  });
  return headerMap;
}

function validateHeaders(headers, headerMap) {
  const requiredMissing = COLUMN_SPECS.filter((spec) => spec.required && !headerMap.has(spec.target))
    .map((spec) => spec.target);

  const missingSupported = COLUMN_SPECS.filter((spec) => !headerMap.has(spec.target)).map(
    (spec) => spec.target
  );

  const ignoredHeaders = headers.filter((header) => !HEADER_ALIASES.has(normalizeHeader(header)));

  return {
    requiredMissing,
    missingSupported,
    ignoredHeaders,
  };
}

function mapRows(headers, dataRows) {
  const headerMap = buildHeaderMap(headers);
  const validation = validateHeaders(headers, headerMap);
  const errors = [];
  const rows = [];

  dataRows.forEach((rawRow, rowIndex) => {
    const lineNo = rowIndex + 2;
    const mappedRow = {};

    if (rawRow.length !== headers.length) {
      errors.push(
        `Line ${lineNo}: expected ${headers.length} column(s), found ${rawRow.length}`
      );
    }

    COLUMN_SPECS.forEach((spec) => {
      const headerIndex = headerMap.get(spec.target);
      const rawValue = headerIndex === undefined ? null : rawRow[headerIndex];
      try {
        mappedRow[spec.target] = convertValue(rawValue, spec);
      } catch (error) {
        errors.push(`Line ${lineNo}: ${error.message}`);
      }
    });

    COLUMN_SPECS.forEach((spec) => {
      if (spec.required && (mappedRow[spec.target] === null || mappedRow[spec.target] === undefined)) {
        errors.push(`Line ${lineNo}: missing required value for ${spec.target}`);
      }
    });

    rows.push(mappedRow);
  });

  return { headerMap, validation, errors, rows };
}

function createStageTableSql() {
  return `
    CREATE TABLE ${STAGE_TABLE} (
      row_no INT NOT NULL,
      PUNO INT NULL,
      PUCODE NVARCHAR(30) NULL,
      PUNAME NVARCHAR(100) NULL,
      PUPARENT INT NULL,
      PUREFCODE NVARCHAR(50) NULL,
      DEPTNO INT NULL,
      COSTCENTERNO INT NULL,
      PUTYPENO INT NULL,
      PUSTATUSNO INT NULL,
      PUCRITICALNO INT NULL,
      PULOCTYPENO INT NULL,
      PULOCATION NVARCHAR(50) NULL,
      NOTE NVARCHAR(MAX) NULL,
      FLAGDEL VARCHAR(1) NULL,
      HIERARCHYNO NVARCHAR(100) NULL,
      CHILDMAX NVARCHAR(7) NULL,
      CURR_LEVEL INT NULL,
      BudgetCalc_Flag VARCHAR(1) NULL,
      TEXT1 NVARCHAR(100) NULL,
      TEXT2 NVARCHAR(100) NULL,
      TEXT3 NVARCHAR(200) NULL,
      NUMBER1 FLOAT NULL,
      NUMBER2 FLOAT NULL,
      DATE1 NVARCHAR(8) NULL,
      DATE2 NVARCHAR(8) NULL,
      LOGIC1 VARCHAR(1) NULL,
      LOGIC2 VARCHAR(1) NULL,
      UPDATEUSER INT NULL,
      UPDATEDATE NVARCHAR(8) NULL,
      PU_DTCost FLOAT NULL
    );
  `;
}

async function insertStageRow(transaction, rowNo, row) {
  const request = new sql.Request(transaction);
  request.input('row_no', sql.Int, rowNo);
  request.input('PUNO', sql.Int, row.PUNO);
  request.input('PUCODE', sql.NVarChar(30), row.PUCODE);
  request.input('PUNAME', sql.NVarChar(100), row.PUNAME);
  request.input('PUPARENT', sql.Int, row.PUPARENT);
  request.input('PUREFCODE', sql.NVarChar(50), row.PUREFCODE);
  request.input('DEPTNO', sql.Int, row.DEPTNO);
  request.input('COSTCENTERNO', sql.Int, row.COSTCENTERNO);
  request.input('PUTYPENO', sql.Int, row.PUTYPENO);
  request.input('PUSTATUSNO', sql.Int, row.PUSTATUSNO);
  request.input('PUCRITICALNO', sql.Int, row.PUCRITICALNO);
  request.input('PULOCTYPENO', sql.Int, row.PULOCTYPENO);
  request.input('PULOCATION', sql.NVarChar(50), row.PULOCATION);
  request.input('NOTE', sql.NVarChar(sql.MAX), row.NOTE);
  request.input('FLAGDEL', sql.VarChar(1), row.FLAGDEL);
  request.input('HIERARCHYNO', sql.NVarChar(100), row.HIERARCHYNO);
  request.input('CHILDMAX', sql.NVarChar(7), row.CHILDMAX);
  request.input('CURR_LEVEL', sql.Int, row.CURR_LEVEL);
  request.input('BudgetCalc_Flag', sql.VarChar(1), row.BudgetCalc_Flag);
  request.input('TEXT1', sql.NVarChar(100), row.TEXT1);
  request.input('TEXT2', sql.NVarChar(100), row.TEXT2);
  request.input('TEXT3', sql.NVarChar(200), row.TEXT3);
  request.input('NUMBER1', sql.Float, row.NUMBER1);
  request.input('NUMBER2', sql.Float, row.NUMBER2);
  request.input('DATE1', sql.NVarChar(8), row.DATE1);
  request.input('DATE2', sql.NVarChar(8), row.DATE2);
  request.input('LOGIC1', sql.VarChar(1), row.LOGIC1);
  request.input('LOGIC2', sql.VarChar(1), row.LOGIC2);
  request.input('UPDATEUSER', sql.Int, row.UPDATEUSER);
  request.input('UPDATEDATE', sql.NVarChar(8), row.UPDATEDATE);
  request.input('PU_DTCost', sql.Float, row.PU_DTCost);

  await request.query(`
    INSERT INTO ${STAGE_TABLE} (
      row_no, PUNO, PUCODE, PUNAME, PUPARENT, PUREFCODE, DEPTNO, COSTCENTERNO,
      PUTYPENO, PUSTATUSNO, PUCRITICALNO, PULOCTYPENO, PULOCATION, NOTE, FLAGDEL,
      HIERARCHYNO, CHILDMAX, CURR_LEVEL, BudgetCalc_Flag, TEXT1, TEXT2, TEXT3,
      NUMBER1, NUMBER2, DATE1, DATE2, LOGIC1, LOGIC2, UPDATEUSER, UPDATEDATE, PU_DTCost
    )
    VALUES (
      @row_no, @PUNO, @PUCODE, @PUNAME, @PUPARENT, @PUREFCODE, @DEPTNO, @COSTCENTERNO,
      @PUTYPENO, @PUSTATUSNO, @PUCRITICALNO, @PULOCTYPENO, @PULOCATION, @NOTE, @FLAGDEL,
      @HIERARCHYNO, @CHILDMAX, @CURR_LEVEL, @BudgetCalc_Flag, @TEXT1, @TEXT2, @TEXT3,
      @NUMBER1, @NUMBER2, @DATE1, @DATE2, @LOGIC1, @LOGIC2, @UPDATEUSER, @UPDATEDATE, @PU_DTCost
    );
  `);
}

async function dropStageTable(transaction) {
  const request = new sql.Request(transaction);
  await request.query(`
    IF OBJECT_ID('dbo.${STAGE_TABLE_NAME}', 'U') IS NOT NULL
      DROP TABLE ${STAGE_TABLE};
  `);
}

async function getIdentityState(transaction) {
  const request = new sql.Request(transaction);
  const result = await request.query(`
    SELECT COLUMNPROPERTY(OBJECT_ID('${TARGET_TABLE}'), 'PUNO', 'IsIdentity') AS is_identity;
  `);
  return result.recordset[0]?.is_identity === 1;
}

async function runValidationQueries(transaction) {
  const request = new sql.Request(transaction);
  const result = await request.query(`
    SELECT COUNT(*) AS stage_count, MIN(PUNO) AS min_puno, MAX(PUNO) AS max_puno
    FROM ${STAGE_TABLE};

    SELECT PUNO, COUNT(*) AS duplicate_count
    FROM ${STAGE_TABLE}
    GROUP BY PUNO
    HAVING COUNT(*) > 1
    ORDER BY PUNO;

    SELECT s.PUNO, p.PUCODE AS existing_pucode, p.PUNAME AS existing_puname
    FROM ${STAGE_TABLE} s
    INNER JOIN ${TARGET_TABLE} p ON p.PUNO = s.PUNO
    ORDER BY s.PUNO;

    SELECT s.PUNO, s.PUPARENT
    FROM ${STAGE_TABLE} s
    WHERE s.PUPARENT IS NOT NULL
      AND s.PUPARENT <> 0
      AND NOT EXISTS (SELECT 1 FROM ${TARGET_TABLE} p WHERE p.PUNO = s.PUPARENT)
      AND NOT EXISTS (SELECT 1 FROM ${STAGE_TABLE} x WHERE x.PUNO = s.PUPARENT)
    ORDER BY s.PUNO;

    SELECT TOP 5 PUNO, PUCODE, PUNAME
    FROM ${STAGE_TABLE}
    ORDER BY PUNO ASC;

    SELECT TOP 5 PUNO, PUCODE, PUNAME
    FROM ${STAGE_TABLE}
    ORDER BY PUNO DESC;
  `);

  return {
    summary: result.recordsets[0][0],
    duplicates: result.recordsets[1],
    existing: result.recordsets[2],
    missingParents: result.recordsets[3],
    firstRows: result.recordsets[4],
    lastRows: result.recordsets[5],
  };
}

async function applyInsert(transaction, skippedExistingCount) {
  const identityInsert = await getIdentityState(transaction);
  const request = new sql.Request(transaction);
  const insertSql = `
    ${identityInsert ? `SET IDENTITY_INSERT ${TARGET_TABLE} ON;` : ''}

    INSERT INTO ${TARGET_TABLE} (
      PUNO, PUCODE, PUNAME, PUPARENT, PUREFCODE, DEPTNO, COSTCENTERNO, PUTYPENO,
      PUSTATUSNO, PUCRITICALNO, PULOCTYPENO, PULOCATION, NOTE, FLAGDEL, HIERARCHYNO,
      CHILDMAX, CURR_LEVEL, BudgetCalc_Flag, TEXT1, TEXT2, TEXT3, NUMBER1, NUMBER2,
      DATE1, DATE2, LOGIC1, LOGIC2, UPDATEUSER, UPDATEDATE, PU_DTCost
    )
    SELECT
      s.PUNO, s.PUCODE, s.PUNAME, s.PUPARENT, s.PUREFCODE, s.DEPTNO, s.COSTCENTERNO, s.PUTYPENO,
      s.PUSTATUSNO, s.PUCRITICALNO, s.PULOCTYPENO, s.PULOCATION, s.NOTE, s.FLAGDEL, s.HIERARCHYNO,
      s.CHILDMAX, s.CURR_LEVEL, s.BudgetCalc_Flag, s.TEXT1, s.TEXT2, s.TEXT3, s.NUMBER1, s.NUMBER2,
      s.DATE1, s.DATE2, s.LOGIC1, s.LOGIC2, s.UPDATEUSER, s.UPDATEDATE, s.PU_DTCost
    FROM ${STAGE_TABLE} s
    WHERE NOT EXISTS (
      SELECT 1
      FROM ${TARGET_TABLE} p
      WHERE p.PUNO = s.PUNO
    );

    SELECT @@ROWCOUNT AS inserted_count;

    SELECT COUNT(*) AS inserted_range_count, MIN(PUNO) AS min_inserted, MAX(PUNO) AS max_inserted
    FROM ${TARGET_TABLE}
    WHERE PUNO IN (SELECT PUNO FROM ${STAGE_TABLE});

    SELECT TOP 5 PUNO, PUCODE, PUNAME
    FROM ${TARGET_TABLE}
    WHERE PUNO IN (SELECT PUNO FROM ${STAGE_TABLE})
    ORDER BY PUNO ASC;

    SELECT TOP 5 PUNO, PUCODE, PUNAME
    FROM ${TARGET_TABLE}
    WHERE PUNO IN (SELECT PUNO FROM ${STAGE_TABLE})
    ORDER BY PUNO DESC;

    ${identityInsert ? `SET IDENTITY_INSERT ${TARGET_TABLE} OFF;` : ''}
  `;

  const insertResult = await request.query(insertSql);

  return {
    insertedCount: insertResult.recordsets[0][0].inserted_count,
    skippedExistingCount,
    insertedRange: insertResult.recordsets[1][0],
    firstInserted: insertResult.recordsets[2],
    lastInserted: insertResult.recordsets[3],
  };
}

async function rebuildExtension(transaction) {
  const request = new sql.Request(transaction);
  const result = await request.query(`
    EXEC dbo.sp_Igx_ParsePUCODEToExtension;
  `);
  return result.recordsets[0]?.[0] || null;
}

function printList(title, values) {
  console.log(`\n${title}`);
  if (!values || values.length === 0) {
    console.log('  none');
    return;
  }
  values.forEach((value) => console.log(`  - ${value}`));
}

function printRows(title, rows) {
  console.log(`\n${title}`);
  if (!rows || rows.length === 0) {
    console.log('  none');
    return;
  }
  rows.forEach((row) => console.log(`  ${JSON.stringify(row)}`));
}

async function main() {
  const { csvPath, apply, rebuildExtension: shouldRebuildExtension } = parseArgs(process.argv);
  const absolutePath = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const parsed = parseCSV(content);
  if (parsed.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const [headers, ...dataRows] = parsed;
  const { validation, errors: parseErrors, rows } = mapRows(headers, dataRows);

  console.log(`Target database: ${dbConfig.database}`);
  console.log(`Target table: ${TARGET_TABLE}`);
  console.log(`CSV path: ${absolutePath}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Data rows parsed: ${rows.length}`);
  console.log(`CSV columns: ${headers.length}`);

  printList('Mapped CSV columns', COLUMN_SPECS.filter((spec) => validation.missingSupported.indexOf(spec.target) === -1).map((spec) => spec.target));
  printList('Missing supported CSV columns', validation.missingSupported);
  printList('Ignored CSV headers', validation.ignoredHeaders);
  printList('Target columns omitted by design', OMITTED_TARGET_COLUMNS);

  if (validation.requiredMissing.length > 0) {
    throw new Error(`Missing required CSV columns: ${validation.requiredMissing.join(', ')}`);
  }

  if (parseErrors.length > 0) {
    printRows('CSV parse/type validation errors', parseErrors);
    throw new Error(`CSV validation failed with ${parseErrors.length} error(s).`);
  }

  const pool = await sql.connect(dbConfig);
  const transaction = new sql.Transaction(pool);
  let stageTableCreated = false;

  try {
    await transaction.begin();
    await new sql.Request(transaction).query(createStageTableSql());
    stageTableCreated = true;

    for (let i = 0; i < rows.length; i++) {
      await insertStageRow(transaction, i + 2, rows[i]);
    }

    const validations = await runValidationQueries(transaction);

    console.log('\nStage summary');
    console.log(`  row count: ${validations.summary.stage_count}`);
    console.log(`  min puno: ${validations.summary.min_puno}`);
    console.log(`  max puno: ${validations.summary.max_puno}`);

    printRows('First staged rows', validations.firstRows);
    printRows('Last staged rows', validations.lastRows);
    printRows('Duplicate PUNO rows in CSV', validations.duplicates);
    printRows('PUNO values already in dbo.PU', validations.existing.slice(0, 20));
    printRows('Missing parent references', validations.missingParents.slice(0, 20));

    if (validations.duplicates.length > 0) {
      throw new Error('CSV contains duplicate PUNO values.');
    }

    if (validations.missingParents.length > 0) {
      throw new Error('CSV contains PUPARENT values not found in dbo.PU or the CSV itself.');
    }

    if (!apply) {
      if (stageTableCreated) {
        await dropStageTable(transaction);
      }
      console.log('\nDry run completed. No database changes were committed.');
      console.log('Re-run with --apply to insert only missing PUNO rows.');
      console.log('Optional: add --rebuild-extension after verifying the insert.');
      await transaction.rollback();
      return;
    }

    const insertResult = await applyInsert(transaction, validations.existing.length);

    console.log('\nInsert summary');
    console.log(`  inserted rows: ${insertResult.insertedCount}`);
    console.log(`  skipped existing rows: ${insertResult.skippedExistingCount}`);
    console.log(`  inserted range count: ${insertResult.insertedRange.inserted_range_count}`);
    console.log(`  inserted min puno: ${insertResult.insertedRange.min_inserted}`);
    console.log(`  inserted max puno: ${insertResult.insertedRange.max_inserted}`);

    printRows('First inserted rows', insertResult.firstInserted);
    printRows('Last inserted rows', insertResult.lastInserted);

    if (shouldRebuildExtension) {
      const extensionSummary = await rebuildExtension(transaction);
      console.log('\nIgxPUExtension rebuild summary');
      console.log(`  ${JSON.stringify(extensionSummary)}`);
    } else {
      console.log('\nIgxPUExtension was not rebuilt.');
      console.log('Run again with --rebuild-extension after confirming the insert results.');
    }

    if (stageTableCreated) {
      await dropStageTable(transaction);
    }
    await transaction.commit();
    console.log('\nImport completed successfully.');
  } catch (error) {
    try {
      if (stageTableCreated) {
        try {
          await dropStageTable(transaction);
        } catch (dropError) {
          console.error('Stage table cleanup failed:', dropError.message);
        }
      }
      if (transaction._aborted !== true) {
        await transaction.rollback();
      }
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});
