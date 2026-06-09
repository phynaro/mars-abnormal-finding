export function formatEmsDate(value?: string | null): string {
  if (value == null || value === '') return '—';
  const s = String(value).trim();
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

export function formatNum(value?: number | null, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function formatRange(
  min?: number | null,
  max?: number | null,
  unit?: string | null
): string {
  if (min == null && max == null) return '—';
  const u = unit?.trim() ? ` ${unit.trim()}` : '';
  if (min != null && max != null) return `${formatNum(min)} – ${formatNum(max)}${u}`;
  if (min != null) return `${formatNum(min)}${u}`;
  return `${formatNum(max!)}${u}`;
}

export function formatManufacturerModel(manufacturer?: string | null, model?: string | null): string {
  const parts = [manufacturer, model].map((p) => p?.trim()).filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}
