const sql = require('mssql');
const dbConfigNew = require('./dbConfigNew');

/** Isolated pool for CEDAR (port 1434). Never use sql.connect(dbConfigNew) — it replaces the global pool used by Cedar6_Mars. */
let cedarPool = null;

async function getCedarPool() {
  if (!cedarPool) {
    cedarPool = await new sql.ConnectionPool(dbConfigNew).connect();
  }
  return cedarPool;
}

module.exports = { getCedarPool };
