/** First two characters of PM PMCODE for PM calibration schedule filters. */

export const PM_CALIBRATION_PLANT_OPTIONS = [
  { code: 'PP', label: 'Pouch Plant' },
  { code: 'DJ', label: 'Dry Jaroen' },
  { code: 'DP', label: 'Dry Plant' },
  { code: 'SN', label: 'Dry Sanook' },
  { code: 'CT', label: 'Care & Treat' },
  { code: 'PS', label: 'Positive Treat' },
] as const;

export type PmCalibrationPlantCode = (typeof PM_CALIBRATION_PLANT_OPTIONS)[number]['code'];

const CODE_SET = new Set<string>(PM_CALIBRATION_PLANT_OPTIONS.map((p) => p.code));

export function parsePmCalibrationPlantParam(plant?: string | null): string[] {
  if (!plant?.trim()) return [];
  return plant
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((c) => CODE_SET.has(c));
}

export function serializePmCalibrationPlants(codes: string[]): string {
  return codes.filter((c) => CODE_SET.has(c.toUpperCase())).join(',');
}

export function labelForPmCalibrationPlant(code: string): string {
  const row = PM_CALIBRATION_PLANT_OPTIONS.find((p) => p.code === code.toUpperCase());
  return row?.label ?? code;
}
