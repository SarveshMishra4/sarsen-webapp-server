/**
 * Metrics Utility
 * 
 * Helper functions for calculating various metrics and statistics.
 * Used by dashboard service for complex calculations.
 */

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive = increase, negative = decrease)
 */
export const calculatePercentChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate moving average
 * @param values - Array of numbers
 * @param window - Window size for moving average
 * @returns Array of moving averages
 */
export const calculateMovingAverage = (
  values: number[],
  window: number
): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += values[i - j];
    }
    result.push(sum / window);
  }
  
  return result;
};

/**
 * Calculate compound annual growth rate (CAGR)
 * @param startValue - Starting value
 * @param endValue - Ending value
 * @param years - Number of years
 * @returns CAGR as percentage
 */
export const calculateCAGR = (
  startValue: number,
  endValue: number,
  years: number
): number => {
  if (startValue === 0 || years === 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

/**
 * Calculate retention rate
 * @param totalUsers - Total users
 * @param returningUsers - Users who returned
 * @returns Retention rate percentage
 */
export const calculateRetentionRate = (
  totalUsers: number,
  returningUsers: number
): number => {
  if (totalUsers === 0) return 0;
  return (returningUsers / totalUsers) * 100;
};

/**
 * Calculate conversion rate
 * @param visitors - Number of visitors
 * @param conversions - Number of conversions
 * @returns Conversion rate percentage
 */
export const calculateConversionRate = (
  visitors: number,
  conversions: number
): number => {
  if (visitors === 0) return 0;
  return (conversions / visitors) * 100;
};

/**
 * Calculate average time between events
 * @param dates - Array of dates
 * @returns Average time in milliseconds
 */
export const calculateAverageTimeBetween = (dates: Date[]): number => {
  if (dates.length < 2) return 0;
  
  let totalDiff = 0;
  for (let i = 1; i < dates.length; i++) {
    totalDiff += dates[i].getTime() - dates[i - 1].getTime();
  }
  
  return totalDiff / (dates.length - 1);
};

/**
 * Group data by time period
 * @param data - Array of objects with date field
 * @param dateField - Name of date field
 * @param period - 'day' | 'week' | 'month' | 'year'
 * @returns Grouped data
 */
export const groupByTimePeriod = <T extends Record<string, any>>(
  data: T[],
  dateField: keyof T,
  period: 'day' | 'week' | 'month' | 'year'
): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};
  
  data.forEach(item => {
    const date = new Date(item[dateField] as any);
    let key: string;
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const week = getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = `${date.getFullYear()}`;
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
};

/**
 * Get week number for date
 * @param date - Date object
 * @returns Week number (1-53)
 */
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

/**
 * Calculate percentile
 * @param values - Array of numbers
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value
 */
export const calculatePercentile = (
  values: number[],
  percentile: number
): number => {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (Math.floor(index) === index) {
    return sorted[index];
  }
  
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  const fraction = index - Math.floor(index);
  
  return lower + (upper - lower) * fraction;
};

/**
 * Calculate standard deviation
 * @param values - Array of numbers
 * @returns Standard deviation
 */
export const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return Math.sqrt(avgSquareDiff);
};

/**
 * Format number with K/M/B suffix
 * @param num - Number to format
 * @returns Formatted string
 */
export const formatCompactNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  return (num / 1000000000).toFixed(1) + 'B';
};

/**
 * Calculate trend direction
 * @param values - Array of numbers in chronological order
 * @returns 'up' | 'down' | 'stable'
 */
export const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';
  
  const first = values[0];
  const last = values[values.length - 1];
  const change = ((last - first) / first) * 100;
  
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
};