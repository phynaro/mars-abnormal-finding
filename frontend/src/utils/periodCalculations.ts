/**
 * Period calculation utilities for Mars Abnormal Finding system
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
