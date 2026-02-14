/**
 * Admin Authentication Validators
 * 
 * Validates incoming request data for admin auth endpoints.
 */

import { ApiError } from '../middleware/error.middleware';

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Validate login request body
 * @param body - Request body
 * @returns Validated login data
 */
export const validateLoginRequest = (body: any): LoginRequest => {
  const errors: string[] = [];
  
  // Check if body exists
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }
  
  // Validate email
  if (!body.email) {
    errors.push('Email is required');
  } else if (typeof body.email !== 'string') {
    errors.push('Email must be a string');
  } else {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(body.email)) {
      errors.push('Please provide a valid email address');
    }
  }
  
  // Validate password
  if (!body.password) {
    errors.push('Password is required');
  } else if (typeof body.password !== 'string') {
    errors.push('Password must be a string');
  } else if (body.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // If any errors, throw
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }
  
  return {
    email: body.email.toLowerCase().trim(),
    password: body.password,
  };
};

/**
 * Validate create admin request (for initial setup)
 * @param body - Request body
 * @returns Validated admin creation data
 */
export const validateCreateAdminRequest = (body: any): LoginRequest => {
  // Same validation as login for now
  // Can be extended if more fields are added later
  return validateLoginRequest(body);
};