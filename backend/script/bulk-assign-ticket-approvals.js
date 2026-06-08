#!/usr/bin/env node
/**
 * Bulk assign ticket approval scopes from a CSV file.
 * Uses the same API as the frontend (POST /api/administration/ticket-approvals/bulk).
 *
 * Usage:
 *   node script/bulk-assign-ticket-approvals.js <path-to.csv>
 *   node script/bulk-assign-ticket-approvals.js <path-to.csv> --per-row
 *
 * Environment:
 *   API_URL    - Base API URL (e.g. http://localhost:3001/api). Default: https://pch.trazor.cloud/api
 *   AUTH_TOKEN - Admin JWT (Bearer token). If not set, script prompts for username/password.
 *
 * CSV: 1 header row.
 * Required columns: plant_code, approval_level (or level).
 * Person: provide personno OR personCode (at least one).
 * Optional: area_code, line_code, machine_code, is_active (true/false/1/0, default true).
 *
 * By default rows are grouped by person + approval level (one confirmation per user/level).
 * Pass --per-row to confirm each CSV row individually.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const API_URL = process.env.API_URL || 'https://pch.trazor.cloud/api';
const DEFAULT_APPROVAL_LEVEL = 2;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\r') break;
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split(/\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => {
      row[h] = values[j] !== undefined ? String(values[j]).trim() : '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function toInt(val, defaultValue) {
  if (val === '' || val === undefined || val === null) return defaultValue;
  const n = parseInt(String(val).trim(), 10);
  return Number.isNaN(n) ? defaultValue : n;
}

function toBool(val, defaultValue = true) {
  if (val === '' || val === undefined || val === null) return defaultValue;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return defaultValue;
}

function askEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function loginAndGetToken() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (q) =>
    new Promise((resolve) => {
      rl.question(q, (answer) => resolve(answer.trim()));
    });

  console.log('No AUTH_TOKEN provided. Logging in via /auth/login...');
  const username = await ask('Admin username: ');
  const password = await ask('Admin password: ');

  rl.close();

  const loginUrl = `${API_URL.replace(/\/$/, '')}/auth/login`;
  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success || !body.token) {
    throw new Error(body.message || body.error || `Login failed (HTTP ${res.status})`);
  }

  console.log(`Login successful as ${body.user?.username || username}.`);
  return body.token;
}

async function searchPersons(search, token, limit = 20) {
  const params = new URLSearchParams({ search, limit: String(limit) });
  const url = `${API_URL.replace(/\/$/, '')}/administration/persons/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `Person search failed (HTTP ${res.status})`);
  }
  return body.data || [];
}

async function resolvePerson(row, token, cache) {
  const personnoRaw = (row.personno || '').trim();
  const personCodeFromRow = (row.personcode || '').trim();

  if (personCodeFromRow && cache.has(personCodeFromRow)) {
    return cache.get(personCodeFromRow);
  }

  if (personnoRaw) {
    const personno = toInt(personnoRaw, null);
    if (personno === null) {
      throw new Error(`Invalid personno: ${personnoRaw}`);
    }
    const result = {
      personno,
      personCode: personCodeFromRow || String(personno),
    };
    if (personCodeFromRow) {
      cache.set(personCodeFromRow, result);
    }
    return result;
  }

  if (!personCodeFromRow) {
    throw new Error('Missing personno or personCode');
  }

  const results = await searchPersons(personCodeFromRow, token, 50);
  const exact = results.find(
    (p) => String(p.PERSONCODE || '').trim().toLowerCase() === personCodeFromRow.toLowerCase()
  );
  if (!exact) {
    throw new Error(`Person not found for personCode: ${personCodeFromRow}`);
  }

  const result = {
    personno: exact.PERSONNO,
    personCode: String(exact.PERSONCODE || personCodeFromRow).trim(),
  };
  cache.set(personCodeFromRow, result);
  return result;
}

function rowToApproval(row, personno) {
  const plantCode = (row.plant_code || row.plantcode || row.plant || '').trim();
  const approvalLevel = toInt(row.approval_level || row.approvallevel || row.level, DEFAULT_APPROVAL_LEVEL);

  if (!plantCode) {
    return null;
  }
  if (![1, 2, 3, 4].includes(approvalLevel)) {
    throw new Error(`Invalid approval_level: ${approvalLevel} (must be 1-4)`);
  }

  const approval = {
    personno,
    plant_code: plantCode,
    approval_level: approvalLevel,
    is_active: toBool(row.is_active || row.isactive, true),
  };

  const areaCode = (row.area_code || row.areacode || row.area || '').trim();
  const lineCode = (row.line_code || row.linecode || row.line || '').trim();
  const machineCode = (row.machine_code || row.machinecode || row.machine || '').trim();

  if (areaCode) approval.area_code = areaCode;
  if (lineCode) approval.line_code = lineCode;
  if (machineCode) approval.machine_code = machineCode;

  return approval;
}

function formatScope(approval) {
  const parts = [approval.plant_code];
  if (approval.area_code) parts.push(approval.area_code);
  if (approval.line_code) parts.push(approval.line_code);
  if (approval.machine_code) parts.push(approval.machine_code);
  return parts.join(' / ');
}

function groupApprovals(items) {
  const groups = new Map();
  for (const item of items) {
    const level = item.approval.approval_level;
    const key = `${item.personno}:${level}`;
    if (!groups.has(key)) {
      groups.set(key, {
        personno: item.personno,
        personCode: item.personCode,
        approval_level: level,
        approvals: [],
        rowIndexes: [],
      });
    }
    const group = groups.get(key);
    group.approvals.push(item.approval);
    group.rowIndexes.push(item.rowIndex);
  }
  return Array.from(groups.values());
}

async function createApprovalsBulk(approvals, token) {
  const url = `${API_URL.replace(/\/$/, '')}/administration/ticket-approvals/bulk`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approvals }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.errors) ? body.errors.join('; ') : '';
    throw new Error([body.message, detail].filter(Boolean).join(' — ') || `HTTP ${res.status}`);
  }
  return body;
}

async function main() {
  const args = process.argv.slice(2);
  const perRow = args.includes('--per-row');
  const csvPath = args.find((a) => !a.startsWith('--'));

  if (!csvPath) {
    console.error('Usage: node script/bulk-assign-ticket-approvals.js <path-to.csv> [--per-row]');
    process.exit(1);
  }

  const absPath = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);
  if (!fs.existsSync(absPath)) {
    console.error('File not found:', absPath);
    process.exit(1);
  }

  let token = process.env.AUTH_TOKEN || process.env.TOKEN || '';
  if (!token) {
    try {
      token = await loginAndGetToken();
    } catch (err) {
      console.error(`Failed to log in and obtain token: ${err.message}`);
      process.exit(1);
    }
  }

  const content = fs.readFileSync(absPath, 'utf8');
  const { rows } = parseCSV(content);
  if (rows.length === 0) {
    console.error('No data rows in CSV (need at least a header row and one data row).');
    process.exit(1);
  }

  console.log(`API: ${API_URL}`);
  console.log(`Found ${rows.length} row(s).`);
  console.log('Required: plant_code + (personno OR personCode). Optional: area_code, line_code, machine_code, is_active.');
  console.log(`Mode: ${perRow ? 'confirm each row' : 'group by person + approval level'}`);
  console.log('You will be asked to press Enter before each assignment batch.\n');

  const personCache = new Map();
  const parsed = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const { personno, personCode } = await resolvePerson(row, token, personCache);
      const approval = rowToApproval(row, personno);
      if (!approval) {
        console.log(`[row ${i + 1}] Skipping: missing plant_code.`);
        skipped++;
        continue;
      }
      parsed.push({ rowIndex: i + 1, personno, personCode, approval });
    } catch (err) {
      console.log(`[row ${i + 1}] Skipping: ${err.message}`);
      skipped++;
    }
  }

  if (parsed.length === 0) {
    console.error('No valid rows to process.');
    process.exit(1);
  }

  const batches = perRow
    ? parsed.map((item) => ({
        personno: item.personno,
        personCode: item.personCode,
        approval_level: item.approval.approval_level,
        approvals: [item.approval],
        rowIndexes: [item.rowIndex],
      }))
    : groupApprovals(parsed);

  let added = 0;
  let failed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const scopes = batch.approvals.map(formatScope).join(', ');

    console.log(
      `[${i + 1}/${batches.length}] Person ${batch.personno} (${batch.personCode}), Level ${batch.approval_level}, ${batch.approvals.length} scope(s)`
    );
    console.log(`  Rows: ${batch.rowIndexes.join(', ')}`);
    console.log(`  Scopes: ${scopes}`);
    await askEnter('Press Enter to assign (or Ctrl+C to abort)...');

    try {
      const result = await createApprovalsBulk(batch.approvals, token);
      const count = result.data?.count ?? batch.approvals.length;
      console.log(`  -> Assigned ${count} approval(s)\n`);
      added += count;
    } catch (err) {
      console.error(`  -> Failed: ${err.message}\n`);
      failed += batch.approvals.length;
    }

    if (i < batches.length - 1) {
      await askEnter('Press Enter to continue to next batch...');
    }
  }

  console.log(`Done. Assigned: ${added}, Skipped rows: ${skipped}, Failed scopes: ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
