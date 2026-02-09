/**
 * Period calculation utilities for EDEN Abnormality Handling
 * 
 * This module provides centralized functions for calculating 28-day periods
 * based on the first Sunday of the week containing January 1st of each year.
 * 
 * All period calculations follow the Mars standard:
 * - Periods are 28 days long
 * - Period 1 starts on the first Sunday of the week containing January 1st
 * - There are 13 periods per year (364 days total)
 * - Remaining days (365th/366th) are ignored
 */

/**
 * Formats a Date object as YYYY-MM-DD in local timezone
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates the first Sunday of the week containing January 1st for a given year
 * This is the anchor date for all 28-day period calculations
 */
export const getFirstSundayOfYear = (year: number): Date => {
  const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
  const firstSunday = new Date(firstDayOfYear);
  const dayOfWeek = firstDayOfYear.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek;
  firstSunday.setDate(firstDayOfYear.getDate() - daysToSubtract);
  return firstSunday;
};

/**
 * Calculates the period number (1-13) for a specific date and year
 */
export const calculatePeriodForDate = (date: Date, year: number) => {
  const firstSunday = getFirstSundayOfYear(year);
  const daysSinceFirstSunday = Math.floor((date.getTime() - firstSunday.getTime()) / (1000 * 60 * 60 * 24));
  const periodNumber = Math.floor(daysSinceFirstSunday / 28) + 1;
  
  return {
    period: periodNumber,
    firstSunday
  };
};

/**
 * Gets the start and end dates for a specific period in a year
 */
export const getPeriodDateRange = (year: number, period: number) => {
  const firstSunday = getFirstSundayOfYear(year);
  const periodStartDate = new Date(firstSunday);
  periodStartDate.setDate(firstSunday.getDate() + (period - 1) * 28);
  
  const periodEndDate = new Date(periodStartDate);
  periodEndDate.setDate(periodStartDate.getDate() + 27);
  
  return {
    startDate: periodStartDate,
    endDate: periodEndDate
  };
};

/**
 * Gets the start and end dates for a company year (13 periods of 28 days)
 */
export const getCompanyYearDateRange = (year: number) => {
  const firstSunday = getFirstSundayOfYear(year);
  const yearStartDate = new Date(firstSunday);
  
  const yearEndDate = new Date(firstSunday);
  yearEndDate.setDate(firstSunday.getDate() + 363); // 13 periods * 28 days - 1
  
  return {
    startDate: yearStartDate,
    endDate: yearEndDate
  };
};

/**
 * Gets the date range based on time filter selection
 * Used by both HomePage and AbnormalReportDashboardV2Page
 */
export const getDateRangeForFilter = (
  timeFilter: string, 
  year?: number, 
  period?: number
): {
  startDate: string;
  endDate: string;
  compare_startDate: string;
  compare_endDate: string;
} => {
  const now = new Date();
  const currentYear = year || now.getFullYear();
  
  switch (timeFilter) {
    case 'this-year': {
      const firstSunday = getFirstSundayOfYear(currentYear);
      const yearEndDate = new Date(firstSunday);
      yearEndDate.setDate(firstSunday.getDate() + 363); // 13 periods * 28 days - 1
      
      // Compare with previous year's period-based range
      const prevYearFirstSunday = getFirstSundayOfYear(currentYear - 1);
      const prevYearEndDate = new Date(prevYearFirstSunday);
      prevYearEndDate.setDate(prevYearFirstSunday.getDate() + 363);
      
      return {
        startDate: formatLocalDate(firstSunday),
        endDate: formatLocalDate(yearEndDate),
        compare_startDate: formatLocalDate(prevYearFirstSunday),
        compare_endDate: formatLocalDate(prevYearEndDate)
      };
    }
    
    case 'last-year': {
      const lastYear = currentYear - 1;
      const firstSunday = getFirstSundayOfYear(lastYear);
      const yearEndDate = new Date(firstSunday);
      yearEndDate.setDate(firstSunday.getDate() + 363);
      
      // Compare with year before last
      const twoYearsAgo = currentYear - 2;
      const prevYearFirstSunday = getFirstSundayOfYear(twoYearsAgo);
      const prevYearEndDate = new Date(prevYearFirstSunday);
      prevYearEndDate.setDate(prevYearFirstSunday.getDate() + 363);
      
      return {
        startDate: formatLocalDate(firstSunday),
        endDate: formatLocalDate(yearEndDate),
        compare_startDate: formatLocalDate(prevYearFirstSunday),
        compare_endDate: formatLocalDate(prevYearEndDate)
      };
    }
    
    case 'this-period': {
      const currentPeriodInfo = calculatePeriodForDate(now, currentYear);
      const currentPeriod = currentPeriodInfo.period;
      
      const { startDate: currentStart, endDate: currentEnd } = getPeriodDateRange(currentYear, currentPeriod);
      const { startDate: prevStart, endDate: prevEnd } = getPeriodDateRange(currentYear, currentPeriod - 1);
      
      return {
        startDate: formatLocalDate(currentStart),
        endDate: formatLocalDate(currentEnd),
        compare_startDate: formatLocalDate(prevStart),
        compare_endDate: formatLocalDate(prevEnd)
      };
    }
    
    case 'select-period': {
      if (!period) {
        throw new Error('Period number is required for select-period filter');
      }
      
      const { startDate: currentStart, endDate: currentEnd } = getPeriodDateRange(currentYear, period);
      const { startDate: prevStart, endDate: prevEnd } = getPeriodDateRange(currentYear, period - 1);
      
      return {
        startDate: formatLocalDate(currentStart),
        endDate: formatLocalDate(currentEnd),
        compare_startDate: formatLocalDate(prevStart),
        compare_endDate: formatLocalDate(prevEnd)
      };
    }
    
    default: {
      // Fallback to calendar year
      const firstSunday = getFirstSundayOfYear(currentYear);
      const yearEndDate = new Date(firstSunday);
      yearEndDate.setDate(firstSunday.getDate() + 363);
      
      const prevYearFirstSunday = getFirstSundayOfYear(currentYear - 1);
      const prevYearEndDate = new Date(prevYearFirstSunday);
      prevYearEndDate.setDate(prevYearFirstSunday.getDate() + 363);
      
      return {
        startDate: formatLocalDate(firstSunday),
        endDate: formatLocalDate(yearEndDate),
        compare_startDate: formatLocalDate(prevYearFirstSunday),
        compare_endDate: formatLocalDate(prevYearEndDate)
      };
    }
  }
};

/**
 * Gets the date range for a specific week within a period
 * Each period has 4 weeks (28 days / 7 = 4 weeks)
 * Week 1: Days 1-7, Week 2: Days 8-14, Week 3: Days 15-21, Week 4: Days 22-28
 */
export const getWeekDateRange = (year: number, period: number, week: number): { startDate: Date; endDate: Date } => {
  if (week < 1 || week > 4) {
    throw new Error('Week must be between 1 and 4');
  }

  const { startDate: periodStart } = getPeriodDateRange(year, period);
  const weekStartDate = new Date(periodStart);
  weekStartDate.setDate(periodStart.getDate() + (week - 1) * 7);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6); // 7 days total (inclusive)

  return {
    startDate: weekStartDate,
    endDate: weekEndDate
  };
};

/**
 * Gets the date range for area dashboard with optional week and date filtering
 * Used by AreaDashboardPage
 */
export const getDateRangeForAreaDashboard = (
  timeFilter: string,
  year: number,
  period?: number,
  week?: number,
  date?: string
): {
  startDate: string;
  endDate: string;
} => {
  let baseRange: { startDate: string; endDate: string };

  // Get base date range from time filter
  if (timeFilter === 'ytd') {
    const { startDate, endDate } = getCompanyYearDateRange(year);
    baseRange = {
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate)
    };
  } else if (timeFilter === 'period' && period) {
    const { startDate, endDate } = getPeriodDateRange(year, period);
    baseRange = {
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate)
    };
  } else {
    // Default to current period
    const now = new Date();
    const currentPeriodInfo = calculatePeriodForDate(now, year);
    const { startDate, endDate } = getPeriodDateRange(year, currentPeriodInfo.period);
    baseRange = {
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate)
    };
  }

  // Apply week filter if provided
  if (week && period) {
    const { startDate: weekStart, endDate: weekEnd } = getWeekDateRange(year, period, week);
    return {
      startDate: formatLocalDate(weekStart),
      endDate: formatLocalDate(weekEnd)
    };
  }

  // Apply date filter if provided
  if (date) {
    return {
      startDate: date,
      endDate: date
    };
  }

  // Return base range if no additional filters
  return baseRange;
};