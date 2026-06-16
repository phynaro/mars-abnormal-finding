export const USER_EVENT_COLORS = [
  { id: 'slate', hex: '#64748B' },
  { id: 'red', hex: '#EF4444' },
  { id: 'orange', hex: '#F97316' },
  { id: 'amber', hex: '#F59E0B' },
  { id: 'green', hex: '#22C55E' },
  { id: 'teal', hex: '#14B8A6' },
  { id: 'blue', hex: '#3B82F6' },
  { id: 'indigo', hex: '#6366F1' },
  { id: 'purple', hex: '#8B5CF6' },
  { id: 'pink', hex: '#EC4899' },
] as const;

export type UserEventColorId = (typeof USER_EVENT_COLORS)[number]['id'];

export const DEFAULT_USER_EVENT_COLOR = USER_EVENT_COLORS[0].hex;

export function normalizeUserEventColorHex(hex: string): string {
  return hex.trim().toUpperCase();
}

export function isAllowedUserEventColor(hex: string | null | undefined): boolean {
  if (!hex?.trim()) return false;
  const normalized = normalizeUserEventColorHex(hex);
  return USER_EVENT_COLORS.some((color) => color.hex.toUpperCase() === normalized);
}

export function resolveUserEventColor(hex: string | null | undefined): string {
  if (!hex?.trim()) return DEFAULT_USER_EVENT_COLOR;
  const normalized = normalizeUserEventColorHex(hex);
  const match = USER_EVENT_COLORS.find((color) => color.hex.toUpperCase() === normalized);
  return match?.hex ?? DEFAULT_USER_EVENT_COLOR;
}

export function coerceUserEventColor(hex: string | null | undefined): string {
  return isAllowedUserEventColor(hex) ? resolveUserEventColor(hex) : DEFAULT_USER_EVENT_COLOR;
}
