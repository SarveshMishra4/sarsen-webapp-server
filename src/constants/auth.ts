/**
 * Authentication Constants
 * 
 * Defines constants related to authentication for both admin and client.
 */

// Token expiry times (in seconds or string format for jwt)
export const TOKEN_EXPIRY = {
  // Admin tokens (shorter for security)
  ADMIN_ACCESS: '15m',      // 15 minutes
  ADMIN_REFRESH: '7d',      // 7 days
  
  // Client tokens (longer for convenience)
  CLIENT_ACCESS: '7d',      // 7 days
  CLIENT_REFRESH: '30d',    // 30 days
} as const;

// Cookie names if using HTTP-only cookies
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// Auth error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_INACTIVE: 'Account is deactivated. Please contact support.',
  TOKEN_MISSING: 'Authentication required. Please provide a valid token.',
  TOKEN_EXPIRED: 'Token expired. Please login again.',
  TOKEN_INVALID: 'Invalid token. Please login again.',
  UNAUTHORIZED_ENGAGEMENT: 'You do not have access to this engagement',
  UNAUTHORIZED_ROLE: 'Access denied. Insufficient permissions.',
} as const;

// Login attempt limits (for rate limiting)
export const LOGIN_LIMITS = {
  MAX_ATTEMPTS: 5,           // Maximum failed attempts
  LOCKOUT_DURATION: 15 * 60, // 15 minutes in seconds
} as const;