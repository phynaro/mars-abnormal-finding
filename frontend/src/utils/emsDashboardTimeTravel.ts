import { startOfMonth } from 'date-fns';

import {
  calculatePeriodForDate,
  formatLocalDate,
  getCompanyYearDateRange,
  getPeriodDateRange,
} from '@/utils/periodCalculations';

export type DashboardTimeRangeMode = 'month' | 'period' | 'year';

export const DASHBOARD_MONTH_I18N_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

/** Human-readable label for the active time-travel selection (matches the filter bar). */
export function formatTimeTravelSelectionLabel(
  value: DashboardTimeTravelValue,
  t: (key: string) => string
): string {
  if (value.mode === 'year') return String(safeYear(value.year));
  if (value.mode === 'period') {
    return `${safeYear(value.year)} P${clampPeriod(value.period)}`;
  }
  const monthKey = DASHBOARD_MONTH_I18N_KEYS[safeMonth(value.month) - 1];
  return `${t(`ems.dashboard.v2.month.${monthKey}`)} ${safeYear(value.year)}`;
}

export interface DashboardTimeTravelValue {
  mode: DashboardTimeRangeMode;
  year: number;
  month: number;
  period: number;
  selectedMonth: Date;
  isPresent: boolean;
}

function buildTimeTravelValue(
  mode: DashboardTimeRangeMode,
  year: number,
  month: number,
  period: number,
  selectedMonth: Date
): DashboardTimeTravelValue {
  const normalizedYear = safeYear(year);
  const normalizedMonth = safeMonth(month);
  const normalizedPeriod = clampPeriod(period);
  const normalizedSelectedMonth = isValidDate(selectedMonth)
    ? startOfMonth(selectedMonth)
    : startOfMonth(new Date());

  return {
    mode,
    year: normalizedYear,
    month: normalizedMonth,
    period: normalizedPeriod,
    selectedMonth: normalizedSelectedMonth,
    isPresent: computeIsPresent(
      mode,
      normalizedYear,
      normalizedMonth,
      normalizedPeriod,
      normalizedSelectedMonth
    ),
  };
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function safeYear(year: number): number {
  const parsed = Number(year);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : new Date().getFullYear();
}

function safeMonth(month: number): number {
  const parsed = Number(month);
  if (!Number.isFinite(parsed)) return new Date().getMonth() + 1;
  return Math.min(12, Math.max(1, Math.trunc(parsed)));
}

function clampPeriod(period: number): number {
  const parsed = Number(period);
  if (!Number.isFinite(parsed)) {
    return calculatePeriodForDate(new Date(), new Date().getFullYear()).period;
  }
  return Math.min(13, Math.max(1, Math.trunc(parsed)));
}

function isCurrentMonth(date: Date): boolean {
  const now = startOfMonth(new Date());
  return startOfMonth(date).getTime() === now.getTime();
}

function isCurrentPeriod(year: number, period: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentPeriod = calculatePeriodForDate(now, currentYear).period;
  return year === currentYear && period === clampPeriod(currentPeriod);
}

function isCurrentCompanyYear(year: number): boolean {
  return year === new Date().getFullYear();
}

export function getTimeTravelDateRange(value: DashboardTimeTravelValue): {
  startDate: string;
  endDate: string;
} {
  const normalizedYear = safeYear(value.year);
  const normalizedMonth = safeMonth(value.month);
  const normalizedPeriod = clampPeriod(value.period);

  if (value.mode === 'year') {
    const { startDate, endDate } = getCompanyYearDateRange(normalizedYear);
    return {
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate),
    };
  }

  if (value.mode === 'period') {
    const { startDate, endDate } = getPeriodDateRange(normalizedYear, normalizedPeriod);
    return {
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate),
    };
  }

  const y = normalizedYear;
  const m = normalizedMonth;
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate: monthStart, endDate: monthEnd };
}

export function getTimeTravelAnchorDate(value: DashboardTimeTravelValue): Date {
  const { startDate } = getTimeTravelDateRange(value);
  const parsed = new Date(`${startDate}T00:00:00`);
  return startOfMonth(isValidDate(parsed) ? parsed : new Date());
}

function computeIsPresent(
  mode: DashboardTimeRangeMode,
  year: number,
  month: number,
  period: number,
  selectedMonth: Date
): boolean {
  if (mode === 'year') return isCurrentCompanyYear(year);
  if (mode === 'period') return isCurrentPeriod(year, period);
  return isCurrentMonth(selectedMonth);
}

export function createDashboardTimeTravelValue(
  mode: DashboardTimeRangeMode = 'month',
  date = new Date()
): DashboardTimeTravelValue {
  const safeDate = isValidDate(date) ? date : new Date();
  const companyYear = safeDate.getFullYear();
  const period = clampPeriod(calculatePeriodForDate(safeDate, companyYear).period);
  const selectedMonth = startOfMonth(safeDate);
  const month = selectedMonth.getMonth() + 1;
  const year = mode === 'year' || mode === 'period' ? companyYear : selectedMonth.getFullYear();

  return buildTimeTravelValue(mode, year, month, period, selectedMonth);
}

export function switchTimeTravelMode(
  value: DashboardTimeTravelValue,
  mode: DashboardTimeRangeMode
): DashboardTimeTravelValue {
  if (value.mode === mode) return value;
  const { startDate, endDate } = getTimeTravelDateRange(value);
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const anchor = isValidDate(start) ? new Date(start) : new Date();
  if (isValidDate(start) && isValidDate(end)) {
    anchor.setDate(
      anchor.getDate() +
        Math.floor((end.getTime() - start.getTime()) / (2 * 24 * 60 * 60 * 1000))
    );
  }
  return createDashboardTimeTravelValue(mode, anchor);
}

export function setTimeTravelMonth(date: Date): DashboardTimeTravelValue {
  return createDashboardTimeTravelValue('month', date);
}

export function setTimeTravelPeriod(year: number, period: number): DashboardTimeTravelValue {
  const normalizedYear = safeYear(year);
  const normalizedPeriod = clampPeriod(period);
  const { startDate } = getPeriodDateRange(normalizedYear, normalizedPeriod);
  const parsed = new Date(`${startDate}T00:00:00`);
  const selectedMonth = isValidDate(parsed) ? startOfMonth(parsed) : startOfMonth(new Date());
  return buildTimeTravelValue(
    'period',
    normalizedYear,
    selectedMonth.getMonth() + 1,
    normalizedPeriod,
    selectedMonth
  );
}

export function setTimeTravelYear(year: number): DashboardTimeTravelValue {
  const normalizedYear = safeYear(year);
  const { startDate } = getCompanyYearDateRange(normalizedYear);
  const parsed = new Date(`${startDate}T00:00:00`);
  const selectedMonth = isValidDate(parsed) ? startOfMonth(parsed) : startOfMonth(new Date());
  const period = clampPeriod(calculatePeriodForDate(selectedMonth, normalizedYear).period);
  return buildTimeTravelValue(
    'year',
    normalizedYear,
    selectedMonth.getMonth() + 1,
    period,
    selectedMonth
  );
}

export function stepTimeTravel(
  value: DashboardTimeTravelValue,
  direction: -1 | 1
): DashboardTimeTravelValue {
  if (value.mode === 'month') {
    const next = new Date(value.selectedMonth);
    next.setMonth(next.getMonth() + direction);
    return setTimeTravelMonth(next);
  }

  if (value.mode === 'period') {
    if (direction < 0) {
      if (value.period > 1) {
        return setTimeTravelPeriod(value.year, value.period - 1);
      }
      return setTimeTravelPeriod(value.year - 1, 13);
    }
    if (value.period < 13) {
      return setTimeTravelPeriod(value.year, value.period + 1);
    }
    return setTimeTravelPeriod(value.year + 1, 1);
  }

  return setTimeTravelYear(value.year + direction);
}
