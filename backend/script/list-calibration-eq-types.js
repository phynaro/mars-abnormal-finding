/**
 * One-off / maintenance: list equipment type keys from calibration PMs (PMCODE contains -CAL)
 * by parsing EQ.EQCODE (5th segment rule). Joins dbo.EQType when EQTYPECODE matches.
 *
 * Usage (from backend/): node script/list-calibration-eq-types.js
 */

require('dotenv').config();
const sql = require('mssql');
const dbConfig = require('../src/config/dbConfig');
const {
  parseCalibrationEqTypeFromEqcode,
  getEqCodeSegment,
} = require('../src/helpers/calibrationEqTypeFromEqcode');

async function main() {
  const pool = await sql.connect(dbConfig);
  const q = `
    SELECT DISTINCT eq.EQNO, eq.EQCODE, eq.EQNAME, eq.EQTYPENO
    FROM dbo.PM pm
    INNER JOIN dbo.EQ eq ON eq.EQNO = pm.EQNO AND (eq.FLAGDEL IS NULL OR eq.FLAGDEL <> 'Y')
    WHERE pm.PMCODE LIKE '%-CAL%'
      AND (pm.FREEZE IS NULL OR LTRIM(RTRIM(pm.FREEZE)) <> 'T')
      AND (pm.FLAGDEL IS NULL OR LTRIM(RTRIM(pm.FLAGDEL)) <> 'T')
  `;
  const { recordset } = await pool.request().query(q);

  const typeMap = new Map();
  for (const row of recordset) {
    const code = row.EQCODE;
    const { fifthSegment, typeKey } = parseCalibrationEqTypeFromEqcode(code);
    const seg4 = getEqCodeSegment(code, 4);
    const fallbackKey =
      typeKey ||
      (fifthSegment == null && seg4 ? String(seg4).match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() ?? null : null);

    const key = fallbackKey || '_UNPARSED';
    if (!typeMap.has(key)) {
      typeMap.set(key, {
        typeKey: key === '_UNPARSED' ? null : key,
        eqnos: new Set(),
        fifthSegments: new Set(),
        sampleCodes: [],
        sampleNames: [],
        eqtypenos: new Set(),
      });
    }
    const agg = typeMap.get(key);
    agg.eqnos.add(row.EQNO);
    if (fifthSegment) agg.fifthSegments.add(fifthSegment);
    if (agg.sampleCodes.length < 3) {
      agg.sampleCodes.push(code);
      agg.sampleNames.push(row.EQNAME || '');
    }
    if (row.EQTYPENO != null && row.EQTYPENO !== 0) agg.eqtypenos.add(row.EQTYPENO);
  }

  const typeKeys = [...typeMap.entries()]
    .filter(([k]) => k !== '_UNPARSED')
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.eqnos.size - a.eqnos.size);

  const etRes = await pool.request().query(`
    SELECT EQTYPENO, EQTYPECODE, EQTYPENAME
    FROM dbo.EQType
    WHERE FLAGDEL IS NULL OR FLAGDEL <> 'Y'
  `);
  const codeToName = new Map();
  for (const et of etRes.recordset) {
    codeToName.set(String(et.EQTYPECODE).trim().toUpperCase(), {
      EQTYPENO: et.EQTYPENO,
      EQTYPENAME: et.EQTYPENAME,
    });
  }

  console.log('Calibration PM equipment types (from EQCODE 5th segment, Cedar6_Mars snapshot)\n');
  console.log('| Type key | EQType match (EQTYPENAME) | Distinct EQ | Example 5th seg | Sample EQCODE |');
  console.log('|----------|---------------------------|-------------|-----------------|---------------|');

  for (const row of typeKeys) {
    const match = codeToName.get(row.key);
    const name = match ? match.EQTYPENAME : '— (no EQTYPECODE match; use EQ.EQNAME per asset)';
    const segs = [...row.fifthSegments].slice(0, 4).join(', ') || '—';
    const sample = (row.sampleCodes[0] || '').replace(/\|/g, '/');
    console.log(
      `| ${row.key} | ${String(name).replace(/\|/g, '/')} | ${row.eqnos.size} | ${segs} | ${sample} |`
    );
  }

  const unparsed = typeMap.get('_UNPARSED');
  if (unparsed && unparsed.eqnos.size > 0) {
    console.log('\n--- Unparsed (fewer than 5 segments or all-numeric 5th token) ---');
    console.log('Distinct EQ:', unparsed.eqnos.size);
    for (const c of unparsed.sampleCodes) console.log('  ', c);
  }

  await pool.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
