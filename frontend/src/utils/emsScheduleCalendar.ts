import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import type { PmCalendarView } from '@/services/calibrationService';

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getCalendarVisibleRange(view: PmCalendarView, date: Date) {
  if (view === 'week') {
    return {
      start: startOfWeek(date),
      end: endOfWeek(date),
    };
  }

  if (view === 'agenda') {
    return {
      start: startOfDay(date),
      end: endOfDay(addDays(date, 29)),
    };
  }

  return {
    start: startOfWeek(startOfMonth(date)),
    end: endOfWeek(endOfMonth(date)),
  };
}
