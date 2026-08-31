/**
 * Run Igx-only backup against cedar_new (CEDAR / SQLSERVER2022DEV).
 *
 * Usage (from repo root or backend):
 *   node backend/script/igx-backup/run-backup-igx.js
 *
 * Creates staging DB CEDAR_IgxOnly, copies dbo.Igx* tables, rebuilds indexes,
 * writes:
 *   C:\Program Files\Microsoft SQL Server\MSSQL16.SQLSERVER2022DEV\MSSQL\Backup\CEDAR_IgxOnly.bak
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
const database = backendEnv.DB_NEW_NAME || 'CEDAR';

const sqlcmd =
  process.env.SQLCMD_PATH ||
  'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\130\\Tools\\Binn\\sqlcmd.exe';

const scriptPath = path.join(__dirname, '01-backup-igx-tables.sql');
const serverArg = `${server}\\${instance},${port}`;

console.log(`Connecting: ${serverArg} / DB=${database} / user=${user}`);
console.log(`Running: ${scriptPath}`);

const result = spawnSync(
  sqlcmd,
  [
    '-S', serverArg,
    '-U', user,
    '-P', password,
    '-d', 'master',
    '-b',
    '-I',
    '-i', scriptPath,
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error(`sqlcmd failed with exit code ${result.status}`);
  process.exit(result.status || 1);
}

const bak =
  'C:\\Program Files\\Microsoft SQL Server\\MSSQL16.SQLSERVER2022DEV\\MSSQL\\Backup\\CEDAR_IgxOnly.bak';
if (fs.existsSync(bak)) {
  const st = fs.statSync(bak);
  console.log(`Backup file OK: ${bak} (${st.size} bytes)`);
} else {
  console.warn(`Backup file not found at expected path: ${bak}`);
}

console.log('Done.');
