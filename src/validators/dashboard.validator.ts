/**
 * Dashboard Validators
 * 
 * Validates incoming request data for dashboard endpoints.
 */

import { ApiError } from '../middleware/error.middleware';

export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  serviceCode?: string;
}

/**
 * Validate dashboard filters from query params
 * @param query - Request query params
 * @returns Validated filters
 */
export const validateDashboardFilters = (query: any): DashboardFilters => {
  const filters: DashboardFilters = {};
  const errors: string[] = [];

  // Validate startDate
  if (query.startDate !== undefined) {
    const date = new Date(query.startDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid start date format');
    } else {
      filters.startDate = date;
    }
  }

  // Validate endDate
  if (query.endDate !== undefined) {
    const date = new Date(query.endDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid end date format');
    } else {
      filters.endDate = date;
    }
  }

  // Validate date range
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    errors.push('Start date cannot be after end date');
  }

  // Validate serviceCode (optional)
  if (query.serviceCode !== undefined) {
    if (typeof query.serviceCode !== 'string') {
      errors.push('Service code must be a string');
    } else if (query.serviceCode.trim().length === 0) {
      errors.push('Service code cannot be empty');
    } else {
      filters.serviceCode = query.serviceCode.trim();
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return filters;
};

/**
 * Validate notification ID parameter
 * @param notificationId - Notification ID from URL params
 */
export const validateNotificationId = (notificationId: string): void => {
  if (!notificationId) {
    throw new ApiError(400, 'Notification ID is required');
  }
  
  if (typeof notificationId !== 'string') {
    throw new ApiError(400, 'Notification ID must be a string');
  }
  
  // Basic format validation for notification IDs (notif_timestamp_random)
  if (!notificationId.startsWith('notif_')) {
    throw new ApiError(400, 'Invalid notification ID format');
  }
};

/**
 * Validate pagination params
 * @param query - Request query params
 * @returns Validated pagination
 */
export const validatePagination = (query: any): { page: number; limit: number } => {
  let page = 1;
  let limit = 20;
  const errors: string[] = [];

  // Validate page
  if (query.page !== undefined) {
    const parsed = parseInt(query.page);
    if (isNaN(parsed) || parsed < 1) {
      errors.push('Page must be a positive number');
    } else {
      page = parsed;
    }
  }

  // Validate limit
  if (query.limit !== undefined) {
    const parsed = parseInt(query.limit);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      limit = parsed;
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return { page, limit };
};