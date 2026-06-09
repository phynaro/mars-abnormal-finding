import { startOfMonth } from 'date-fns';

export interface DashboardTimeTravelValue {
  selectedMonth: Date;
  year: number;
  month: number;
  isCurrentMonth: boolean;
}

export function createDashboardTimeTravelValue(date = new Date()): DashboardTimeTravelValue {
  const selectedMonth = startOfMonth(date);
  const now = startOfMonth(new Date());
  return {
    selectedMonth,
    year: selectedMonth.getFullYear(),
    month: selectedMonth.getMonth() + 1,
    isCurrentMonth: selectedMonth.getTime() === now.getTime(),
  };
}
