const sql = require('mssql');
const dbConfig = require('./dbConfig');
const dbConfigNew = require('./dbConfigNew');

/** Isolated pools — never use sql.connect() for these; it replaces the global pool and pool.close() breaks concurrent callers. */
let cedarPool = null;
let marsPool = null;

async function getCedarPool() {
  if (!cedarPool) {
    cedarPool = await new sql.ConnectionPool(dbConfigNew).connect();
  }
  return cedarPool;
}

/** Cedar6_Mars — Person, IgxUserExtension, IgxEmsManagerArea, IgxNotificationSchedule. */
async function getMarsPool() {
  if (!marsPool) {
    marsPool = await new sql.ConnectionPool(dbConfig).connect();
  }
  return marsPool;
}

module.exports = { getCedarPool, getMarsPool };
