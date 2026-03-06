#!/usr/bin/env node
/**
 * Bulk add users from a CSV file.
 * Uses the same API as the frontend (POST /api/users) so all validation and rules match.
 *
 * Usage:
 *   node script/bulk-add-users.js <path-to.csv>
 *
 * Environment:
 *   API_URL   - Base API URL (e.g. http://localhost:3001/api). Default: http://localhost:3001/api
 *   AUTH_TOKEN - Admin JWT (Bearer token). If not set, script can log in with username/password.
 *
 * CSV: 1 header row. Columns (required): userId, password, firstName, lastName, groupNo.
 * Optional: email, phone, title, personCode, department, craft, crew, siteNo, levelReport, storeRoom, dbNo, lineId.
 * Defaults when empty: groupNo=11, siteNo=3, levelReport=5, storeRoom=1, dbNo=1 (same as CreateUserModal).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const API_URL = process.env.API_URL || 'https://pch.trazor.cloud/api';
const DEFAULT_GROUP_NO = 11;
const DEFAULT_SITE_NO = 3;
const DEFAULT_LEVEL_REPORT = 5;
const DEFAULT_STORE_ROOM = 1;
const DEFAULT_DB_NO = 1;

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
  // Normalize headers: lowercase, no spaces (e.g. "Person Code" -> "personcode")
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

function rowToPayload(row) {
  const userId = (row.userid || '').trim();
  const password = (row.password || '').trim();
  const firstName = (row.firstname || '').trim();
  const lastName = (row.lastname || '').trim();
  if (!userId || !password || !firstName || !lastName) {
    return null;
  }
  const payload = {
    userId,
    password,
    firstName,
    lastName,
    groupNo: toInt(row.groupno, DEFAULT_GROUP_NO),
    siteNo: toInt(row.siteno, DEFAULT_SITE_NO),
    levelReport: toInt(row.levelreport, DEFAULT_LEVEL_REPORT),
    storeRoom: toInt(row.storeroom, DEFAULT_STORE_ROOM),
    dbNo: toInt(row.dbno, DEFAULT_DB_NO),
  };
  if ((row.email || '').trim()) payload.email = row.email.trim();
  if ((row.phone || '').trim()) payload.phone = row.phone.trim();
  if ((row.title || '').trim()) payload.title = row.title.trim();
  if ((row.personcode || '').trim()) payload.personCode = row.personcode.trim();
  if ((row.department || '').trim()) payload.department = toInt(row.department, undefined);
  if ((row.craft || '').trim()) payload.craft = toInt(row.craft, undefined);
  if ((row.crew || '').trim()) payload.crew = toInt(row.crew, undefined);
  if ((row.lineid || '').trim()) payload.lineId = row.lineid.trim();
  return payload;
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

async function createUser(payload, token) {
  const url = `${API_URL.replace(/\/$/, '')}/users`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return body;
}

async function loginAndGetToken() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (q, hide = false) =>
    new Promise((resolve) => {
      if (!hide) {
        rl.question(q, (answer) => resolve(answer.trim()));
      } else {
        // Simple password prompt without echo masking
        rl.question(q, (answer) => resolve(answer.trim()));
      }
    });

  console.log('No AUTH_TOKEN provided. Logging in via /auth/login...');
  const username = await ask('Admin username: ');
  const password = await ask('Admin password: ', true);

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

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node script/bulk-add-users.js <path-to.csv>');
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
  console.log(`Found ${rows.length} row(s). Required columns: userId, password, firstName, lastName; groupNo optional (default ${DEFAULT_GROUP_NO}).`);
  console.log('You will be asked to press Enter before each user is added.\n');

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const payload = rowToPayload(row);
    if (!payload) {
      console.log(`[${i + 1}/${rows.length}] Skipping row: missing required userId, password, firstName or lastName.`);
      skipped++;
      await askEnter('Press Enter to continue to next user...');
      continue;
    }

    console.log(`[${i + 1}/${rows.length}] User: ${payload.userId} (${payload.firstName} ${payload.lastName}) groupNo=${payload.groupNo}`);
    await askEnter('Press Enter to add this user (or Ctrl+C to abort)...');

    try {
      const result = await createUser(payload, token);
      console.log(`  -> Created: ${result.user?.userId || payload.userId}\n`);
      added++;
    } catch (err) {
      console.error(`  -> Failed: ${err.message}\n`);
      failed++;
    }

    if (i < rows.length - 1) {
      await askEnter('Press Enter to continue to next user...');
    }
  }

  console.log(`Done. Added: ${added}, Skipped: ${skipped}, Failed: ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
