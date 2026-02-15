/**
 * Token Utility
 * 
 * Helper functions for token generation and validation.
 * Complements token.service.ts with utility functions.
 */

import crypto from 'crypto';

/**
 * Generate a random secure password for new client accounts
 * Used when creating accounts after payment
 * @returns Random password string
 */
export const generateSecurePassword = (): string => {
  // Generate a random password with:
  // - At least one uppercase
  // - At least one lowercase
  // - At least one number
  // - At least one special character
  // - Minimum 12 characters length
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each type
  let password = '';
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];
  
  // Add 8 more random characters
  for (let i = 0; i < 8; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to avoid predictable pattern
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 2) - 1)
    .join('');
};

/**
 * Generate a unique login ID for engagement access
 * @returns Unique login ID string
 */
export const generateLoginId = (): string => {
  // Format: ENG-XXXXXXXX where X is random alphanumeric
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ENG-${randomPart}`;
};

/**
 * Generate a unique receipt ID for orders
 * Format: RCP-YYYY-XXXXX (e.g., RCP-2024-00001)
 * @returns Unique receipt ID
 */
export const generateReceiptId = (): string => {
  const year = new Date().getFullYear();
  
  // Use timestamp + random to create unique ID
  // This is a simplified version - in production you might want to track sequences
  const timestamp = Date.now().toString().slice(-8);
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `RCP-${year}-${timestamp}${random}`;
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
};

/**
 * Check if token is about to expire
 * @param token - JWT token
 * @param thresholdMinutes - Minutes threshold (default: 5)
 * @returns Boolean indicating if token needs refresh
 */
export const isTokenExpiringSoon = (token: string, thresholdMinutes: number = 5): boolean => {
  try {
    // Decode without verification (just to check expiry)
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    
    if (!payload.exp) {
      return false;
    }
    
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return expiryTime - currentTime < thresholdMs;
  } catch (error) {
    return false; // If can't decode, assume not expiring soon
  }
};