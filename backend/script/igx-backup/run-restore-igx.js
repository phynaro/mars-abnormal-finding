/**
 * Restore Igx* tables from staging DB CEDAR_IgxOnly into CEDAR.
 *
 * Prerequisites:
 *   - Full CEDAR restore already done (without Igx* tables), OR Igx* tables absent
 *   - CEDAR_IgxOnly present (live staging DB, or restored from CEDAR_IgxOnly.bak)
 *
 * Usage:
 *   node backend/script/igx-backup/run-restore-igx.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const backendEnv = loadEnv(path.join(__dirname, '../../.env'));
const server = backendEnv.DB_NEW_SERVER || 'localhost';
const instance = backendEnv.DB_NEW_INSTANCE || 'SQLSERVER2022DEV';
const user = backendEnv.DB_NEW_USER || 'sa';
const password = backendEnv.DB_NEW_PASSWORD || '';
const port = backendEnv.DB_NEW_PORT || '1434';

const sqlcmd =
  process.env.SQLCMD_PATH ||
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\130\\Tools\\Binn\\sqlcmd.exe';

const scriptPath = path.join(__dirname, '02-restore-igx-tables-into-cedar.sql');
const serverArg = `${server}\\${instance},${port}`;

console.log(`Connecting: ${serverArg} / user=${user}`);
console.log(`Running: ${scriptPath}`);

const result = spawnSync(
  sqlcmd,
  ['-S', serverArg, '-U', user, '-P', password, '-d', 'master', '-b', '-I', '-i', scriptPath],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error(`sqlcmd failed with exit code ${result.status}`);
  process.exit(result.status || 1);
}

console.log('Done.');
