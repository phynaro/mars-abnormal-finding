/**
 * One-time migration: create EDEN-owned Igx tables in new Cedar (CEDAR DB) and
 * copy IgxDateDim rows from old Cedar (Cedar6_Mars).
 *
 * Run once before switching calibration controllers to new Cedar:
 *   cd backend
 *   node script/migrate-igx-to-new-cedar.js
 *
 * Safe to re-run — uses IF NOT EXISTS guards and skips rows already present.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');

const oldConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'Cedar6_Mars',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

const newInstance = process.env.DB_NEW_INSTANCE;
const newServer = process.env.DB_NEW_SERVER || 'localhost';
const newServerName = newInstance ? `${newServer}\\${newInstance}` : newServer;

const newConfig = {
  server: newServerName,
  port: parseInt(process.env.DB_NEW_PORT || '1434', 10),
  database: process.env.DB_NEW_NAME || 'CEDAR',
  user: process.env.DB_NEW_USER || 'sa',
  password: process.env.DB_NEW_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    serverName: newServerName,
  },
};

async function run() {
  console.log('Connecting to old Cedar (Cedar6_Mars)...');
  const oldPool = await new sql.ConnectionPool(oldConfig).connect();

  console.log('Connecting to new Cedar (CEDAR)...');
  const newPool = await new sql.ConnectionPool(newConfig).connect();

  // ── 1. Create IgxDateDim in new Cedar ──────────────────────────────────────
  console.log('\n[1/3] Creating IgxDateDim in new Cedar (if not exists)...');
  await newPool.request().query(`
    IF OBJECT_ID('dbo.IgxDateDim', 'U') IS NULL
    CREATE TABLE dbo.IgxDateDim (
      DateKey        date    NOT NULL,
      CompanyYear    int     NOT NULL,
      CompanyWeekNo  int     NOT NULL,
      PeriodNo       int     NOT NULL,
      PeriodStart    date    NOT NULL,
      PeriodEndExcl  date    NOT NULL,
      PeriodWeeks    tinyint NOT NULL,
      HasWeek53      bit     NOT NULL,
      CONSTRAINT PK_IgxDateDim PRIMARY KEY (DateKey, CompanyYear)
    )
  `);
  console.log('  IgxDateDim ready.');

  // ── 2. Copy IgxDateDim rows from old Cedar ─────────────────────────────────
  console.log('\n[2/3] Copying IgxDateDim rows from old Cedar...');
  const rows = await oldPool.request().query(
    'SELECT DateKey, CompanyYear, CompanyWeekNo, PeriodNo, PeriodStart, PeriodEndExcl, PeriodWeeks, HasWeek53 FROM dbo.IgxDateDim ORDER BY DateKey, CompanyYear'
  );
  const total = rows.recordset.length;
  console.log(`  Found ${total} rows in old Cedar.`);

  let inserted = 0;
  let skipped = 0;
  const BATCH = 500;
  for (let i = 0; i < total; i += BATCH) {
    const batch = rows.recordset.slice(i, i + BATCH);
    for (const r of batch) {
      const req = newPool.request();
      req.input('DateKey', sql.Date, r.DateKey);
      req.input('CompanyYear', sql.Int, r.CompanyYear);
      req.input('CompanyWeekNo', sql.Int, r.CompanyWeekNo);
      req.input('PeriodNo', sql.Int, r.PeriodNo);
      req.input('PeriodStart', sql.Date, r.PeriodStart);
      req.input('PeriodEndExcl', sql.Date, r.PeriodEndExcl);
      req.input('PeriodWeeks', sql.TinyInt, r.PeriodWeeks);
      req.input('HasWeek53', sql.Bit, r.HasWeek53);
      const result = await req.query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.IgxDateDim WHERE DateKey = @DateKey AND CompanyYear = @CompanyYear)
          INSERT INTO dbo.IgxDateDim (DateKey, CompanyYear, CompanyWeekNo, PeriodNo, PeriodStart, PeriodEndExcl, PeriodWeeks, HasWeek53)
          VALUES (@DateKey, @CompanyYear, @CompanyWeekNo, @PeriodNo, @PeriodStart, @PeriodEndExcl, @PeriodWeeks, @HasWeek53)
      `);
      if (result.rowsAffected[0] > 0) inserted++;
      else skipped++;
    }
    console.log(`  Progress: ${Math.min(i + BATCH, total)}/${total}`);
  }
  console.log(`  Done — inserted: ${inserted}, skipped (already existed): ${skipped}`);

  // ── 3. Create IgxCalibrationUserEvents in new Cedar ───────────────────────
  console.log('\n[3/3] Creating IgxCalibrationUserEvents in new Cedar (if not exists)...');
  await newPool.request().query(`
    IF OBJECT_ID('dbo.IgxCalibrationUserEvents', 'U') IS NULL
    CREATE TABLE dbo.IgxCalibrationUserEvents (
      id           INT IDENTITY(1,1) NOT NULL,
      title        NVARCHAR(200)     NOT NULL,
      description  NVARCHAR(MAX)     NULL,
      category     VARCHAR(30)       NOT NULL,
      start_at     DATETIME2         NOT NULL,
      end_at       DATETIME2         NOT NULL,
      is_all_day   BIT               NOT NULL CONSTRAINT DF_IgxCalUE_is_all_day DEFAULT (0),
      plant_code   VARCHAR(2)        NULL,
      dept_no      INT               NULL,
      assignee_id  INT               NULL,
      color_hex    VARCHAR(7)        NULL,
      is_active    BIT               NOT NULL CONSTRAINT DF_IgxCalUE_is_active DEFAULT (1),
      created_by   INT               NOT NULL,
      created_at   DATETIME2         NOT NULL CONSTRAINT DF_IgxCalUE_created_at DEFAULT (SYSDATETIME()),
      updated_by   INT               NULL,
      updated_at   DATETIME2         NULL,
      deleted_by   INT               NULL,
      deleted_at   DATETIME2         NULL,
      CONSTRAINT PK_IgxCalibrationUserEvents PRIMARY KEY (id)
    )
  `);
  console.log('  IgxCalibrationUserEvents ready.');

  await oldPool.close();
  await newPool.close();
  console.log('\nMigration complete.');
}

run().catch(function (err) {
  console.error('Migration failed:', err);
  process.exit(1);
});
