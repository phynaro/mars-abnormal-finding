const sql = require('mssql');

// Build server value supporting optional named instance via env
const dbServer = process.env.DB_SERVER;
console.log('dbServer', dbServer);
const dbInstance = process.env.DB_INSTANCE; // e.g., 'SQLEXPRESS'
console.log('dbInstance', dbInstance);
const serverName = dbInstance ? `${dbServer}\\${dbInstance}` : dbServer;

const dbConfig = {
  server: serverName,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'Cedar6_Mars',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: (process.env.DB_ENCRYPT || 'true').toLowerCase() === 'true',
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true',
    enableArithAbort: true,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    // Fix TLS ServerName deprecation warning
    serverName: serverName,
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  }
};

module.exports = dbConfig;
