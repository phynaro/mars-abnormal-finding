const sql = require('mssql');

const dbNewServer = process.env.DB_NEW_SERVER || 'localhost';
const dbNewInstance = process.env.DB_NEW_INSTANCE;
const serverName = dbNewInstance ? `${dbNewServer}\\${dbNewInstance}` : dbNewServer;

const dbConfigNew = {
  server: serverName,
  port: parseInt(process.env.DB_NEW_PORT || '1434', 10),
  database: process.env.DB_NEW_NAME || 'CEDAR',
  user: process.env.DB_NEW_USER || 'sa',
  password: process.env.DB_NEW_PASSWORD || '',
  options: {
    encrypt: (process.env.DB_NEW_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: (process.env.DB_NEW_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true',
    enableArithAbort: true,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    serverName: serverName,
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  },
};

module.exports = dbConfigNew;
