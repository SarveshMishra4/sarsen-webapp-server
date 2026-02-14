/**
 * Admin Authentication Service
 * 
 * Contains business logic for admin authentication:
 * - Login validation
 * - Session creation
 * - Logout handling
 */

import { Admin } from '../models/Admin.model';
import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password.util';
import { generateAdminAccessToken, generateRefreshToken } from './token.service';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  admin: {
    id: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Authenticate admin with email and password
 * @param credentials - Login credentials
 * @returns Auth response with admin data and tokens
 */
export const loginAdmin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const { email, password } = credentials;
  
  // Find admin by email (explicitly select password since it's excluded by default)
  const admin = await Admin.findOne({ email }).select('+password');
  
  if (!admin) {
    logger.warn(`Login attempt with non-existent email: ${email}`);
    throw new ApiError(401, 'Invalid email or password');
  }
  
  // Check if admin account is active
  if (!admin.isActive) {
    logger.warn(`Login attempt on inactive account: ${email}`);
    throw new ApiError(403, 'Account is deactivated. Please contact support.');
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, admin.password);
  if (!isPasswordValid) {
    logger.warn(`Invalid password attempt for admin: ${email}`);
    throw new ApiError(401, 'Invalid email or password');
  }
  
  // Update last login timestamp
  admin.lastLoginAt = new Date();
  await admin.save();
  
  // Generate tokens
  const tokenPayload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  };
  
  const accessToken = generateAdminAccessToken({ ...tokenPayload, role: 'ADMIN' });
  const refreshToken = generateRefreshToken(tokenPayload);
  
  logger.info(`Admin logged in successfully: ${email}`);
  
  return {
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Create a new admin account (for initial setup)
 * @param email - Admin email
 * @param password - Admin password
 * @returns Created admin (without password)
 */
export const createAdmin = async (email: string, password: string): Promise<any> => {
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new ApiError(400, passwordValidation.message);
  }
  
  // Check if admin already exists
  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    throw new ApiError(409, 'Admin with this email already exists');
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Create admin
  const admin = await Admin.create({
    email,
    password: hashedPassword,
  });
  
  logger.info(`New admin account created: ${email}`);
  
  return admin; // Password excluded automatically by toJSON
};

/**
 * Refresh access token using refresh token
 * @param refreshToken - Valid refresh token
 * @returns New access token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  try {
    const { verifyRefreshToken } = await import('./token.service');
    const decoded = verifyRefreshToken(refreshToken);
    
    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      throw new ApiError(401, 'Admin not found or deactivated');
    }
    
    // Generate new access token
    const accessToken = generateAdminAccessToken({
      id: admin.id,
      email: admin.email,
      role: admin.role as 'ADMIN',
    });
    
    return { accessToken };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Invalid refresh token');
  }
};

/**
 * Logout admin (client-side only - token invalidation can be added later with blacklist)
 * @param adminId - Admin ID
 */
export const logoutAdmin = async (adminId: string): Promise<void> => {
  // For now, just log the action
  // In future phases, we could add token blacklisting
  logger.info(`Admin logged out: ${adminId}`);
  
  // TODO: Phase 2 Enhancement - Add token blacklist if needed
  // This would store invalidated tokens until they expire
};