/**
 * Admin Authentication Controller
 * 
 * Handles HTTP requests for admin authentication:
 * - Login
 * - Logout
 * - Token refresh
 * - Session check
 */

import { Request, Response, NextFunction } from 'express';
import * as adminAuthService from '../services/adminAuth.service';
import { validateLoginRequest, validateCreateAdminRequest } from '../validators/adminAuth.validator';
// import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';

/**
 * Login admin
 * POST /api/admin/auth/login
 */
export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const credentials = validateLoginRequest(req.body);
    
    // Authenticate admin
    const authResponse = await adminAuthService.loginAdmin(credentials);
    
    // TODO: Phase 0 Decision - Token storage method
    // If using HTTP-only cookies (recommended), set cookies here
    // If using localStorage, just return tokens in response
    
    // For now, return tokens in response body
    // Frontend can decide storage strategy
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new admin (for initial setup)
 * POST /api/admin/auth/create
 * This should be disabled or protected in production
 */
export const createAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { email, password } = validateCreateAdminRequest(req.body);
    
    // Create admin
    const admin = await adminAuthService.createAdmin(email, password);
    
    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: { admin },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/admin/auth/refresh
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new ApiError(400, 'Refresh token is required');
    }
    
    const { accessToken } = await adminAuthService.refreshAccessToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout admin
 * POST /api/admin/auth/logout
 */
export const logoutAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Admin ID should be attached by auth middleware
    const adminId = req.admin?.id;
    
    if (adminId) {
      await adminAuthService.logoutAdmin(adminId);
    }
    
    // TODO: If using cookies, clear them here
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current admin profile
 * GET /api/admin/auth/me
 */
export const getCurrentAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Admin should be attached by auth middleware
    if (!req.admin) {
      throw new ApiError(401, 'Not authenticated');
    }
    
    res.status(200).json({
      success: true,
      data: { admin: req.admin },
    });
  } catch (error) {
    next(error);
  }
};