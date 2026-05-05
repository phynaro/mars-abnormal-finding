/**
 * Derive calibration equipment "type key" from dbo.EQ.EQCODE (hyphen-separated tagging convention).
 *
 * Convention (per business rule):
 * - Split EQCODE on '-' after removing internal spaces (e.g. "DP- EXTR-..." → "DP-EXTR-...").
 * - The 5th segment (1-based) is the equipment-type token, e.g. PP-RETA-RETO-04-TE-01 → "TE".
 * - When the 5th segment includes a numeric suffix (TE01, WTT01), the type key is the leading letters (TE, WTT).
 *
 * dbo.EQ has EQNAME (description text), not a column named "Description". Official type names live in
 * dbo.EQType (EQTYPENAME / EQTYPECODE) when EQ.EQTYPENO is set; most calibration rows use EQTYPENO = 0,
 * so resolving the display name is usually: match EQTYPECODE to the parsed key, else use EQNAME / "Unknown".
 */

/** @param {string | null | undefined} eqCode */
function normalizeEqCode(eqCode) {
  if (eqCode == null) return '';
  return String(eqCode).replace(/\s+/g, '').trim();
}

/**
 * 1-based segment index (1 = plant prefix, …, 5 = type token per standard codes).
 * @param {string} eqCode
 * @param {number} oneBasedIndex
 * @returns {string | null}
 */
function getEqCodeSegment(eqCode, oneBasedIndex) {
  const norm = normalizeEqCode(eqCode);
  if (!norm) return null;
  const parts = norm.split('-').filter((p) => p.length > 0);
  const i = oneBasedIndex - 1;
  if (i < 0 || i >= parts.length) return null;
  return parts[i];
}

/**
 * Fifth hyphen-separated segment (equipment type token, possibly with digits: TE01).
 * @param {string} eqCode
 * @returns {string | null}
 */
function getFifthSegment(eqCode) {
  return getEqCodeSegment(eqCode, 5);
}

/**
 * Type key for grouping (e.g. TE01 → TE, WTT01 → WTT, TE → TE).
 * @param {string | null | undefined} fifthSegment
 * @returns {string | null}
 */
function typeKeyFromFifthSegment(fifthSegment) {
  if (fifthSegment == null || fifthSegment === '') return null;
  const seg = String(fifthSegment).trim();
  const m = seg.match(/^([A-Za-z]+)/);
  if (m) return m[1].toUpperCase();
  return null;
}

/**
 * @param {string} eqCode
 * @returns {{ fifthSegment: string | null, typeKey: string | null }}
 */
function parseCalibrationEqTypeFromEqcode(eqCode) {
  const fifthSegment = getFifthSegment(eqCode);
  return {
    fifthSegment,
    typeKey: typeKeyFromFifthSegment(fifthSegment),
  };
}

/**
 * Display labels when EQType has no matching EQTYPECODE (site codes like TE vs TEM).
 * Prefer dbo.EQType when available; use these only as fallback for KPI copy.
 */
const CAL_EQ_TYPE_LABEL_OVERRIDES = {
  TE: 'Temperature Element',
  TI: 'Temperature Indicator',
  WTT: 'Weight transmitter',
  PT: 'Pressure transmitter',
  PI: 'Pressure indicator',
  PG: 'Pressure gauge',
  LT: 'Level transmitter',
  LI: 'Level indicator',
  FLT: 'Flow transmitter',
  FLO: 'Flow meter',
  TC: 'Thermocouple',
  TL: 'Temperature Loop',
  TH: 'Thermometer',
  PS: 'Pressure switch',
  TG: 'Temperature gauge',
  HS: 'Humidity sensor',
  PR: 'Pressure regulator',
  TR: 'Temperature recorder',
  HOT: 'Hot junction',
  WBF: 'Weight Belt Feeder',
  LIW: 'Level Indicator',
  SWD: 'Standard Weight Device',
  /** Confirm against EQ.EQNAME / process area */
  SDW: 'Scale / weight device',
  MNT: 'Metal detector / magnet',
  CW: 'Checkweigher',
  CLK: 'Clock Controller',
  CTV: 'Control Valve',
  DPC: 'Dryer Pass Conveyor',
};

/**
 * @param {string | null | undefined} typeKey uppercase key from typeKeyFromFifthSegment
 * @returns {string | null}
 */
function suggestedLabelForTypeKey(typeKey) {
  if (!typeKey) return null;
  return CAL_EQ_TYPE_LABEL_OVERRIDES[typeKey] ?? null;
}

module.exports = {
  normalizeEqCode,
  getEqCodeSegment,
  getFifthSegment,
  typeKeyFromFifthSegment,
  parseCalibrationEqTypeFromEqcode,
  CAL_EQ_TYPE_LABEL_OVERRIDES,
  suggestedLabelForTypeKey,
};
