/**
 * Token Service
 * 
 * Handles JWT token generation, verification, and decoding.
 * Uses environment variables for secrets and expiry times.
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface AdminTokenPayload extends TokenPayload {
  role: 'ADMIN';
}

export interface ClientTokenPayload extends TokenPayload {
  role: 'CLIENT';
  engagementId?: string;
}

/**
 * Generate access token for admin
 * @param payload - Admin user data
 * @returns JWT access token
 */
export const generateAdminAccessToken = (payload: AdminTokenPayload): string => {
  try {
    // FIXED: Ensure secret is treated as string and properly typed
    const secret = String(env.JWT_ACCESS_SECRET);
    
    // FIXED: Explicitly type the options
    const options: jwt.SignOptions = {
      expiresIn: env.JWT_ADMIN_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    
    const token = jwt.sign(payload, secret, options);
    return token;
  } catch (error) {
    logger.error('Error generating admin access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate refresh token
 * @param payload - User data
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  try {
    // FIXED: Ensure secret is treated as string
    const secret = String(env.JWT_REFRESH_SECRET);
    
    // FIXED: Explicitly type the options
    const options: jwt.SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    
    const token = jwt.sign(payload, secret, options);
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify admin access token
 * @param token - JWT token to verify
 * @returns Decoded payload or throws error
 */
export const verifyAdminAccessToken = (token: string): AdminTokenPayload => {
  try {
    // FIXED: Ensure secret is treated as string
    const secret = String(env.JWT_ACCESS_SECRET);
    
    const decoded = jwt.verify(token, secret) as AdminTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Verify refresh token
 * @param token - JWT refresh token to verify
 * @returns Decoded payload or throws error
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    // FIXED: Ensure secret is treated as string
    const secret = String(env.JWT_REFRESH_SECRET);
    
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw new Error('Refresh token verification failed');
  }
};

/**
 * Generate client access token (will be used in Phase 4)
 * @param payload - Client user data
 * @returns JWT access token
 */
export const generateClientAccessToken = (payload: ClientTokenPayload): string => {
  try {
    // FIXED: Ensure secret is treated as string
    const secret = String(env.JWT_ACCESS_SECRET);
    
    // FIXED: Explicitly type the options
    const options: jwt.SignOptions = {
      expiresIn: env.JWT_CLIENT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    
    const token = jwt.sign(payload, secret, options);
    return token;
  } catch (error) {
    logger.error('Error generating client access token:', error);
    throw new Error('Failed to generate access token');
  }
};