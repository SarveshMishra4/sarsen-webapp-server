/**
 * Client Authentication Controller
 * 
 * Handles HTTP requests for client authentication:
 * - Login
 * - Logout
 * - Token refresh
 * - Session check
 * - Get user engagements
 */

import { Request, Response, NextFunction } from 'express';
import * as clientAuthService from '../services/clientAuth.service';
import { validateClientLogin } from '../validators/clientAuth.validator';
import { verifyRefreshToken, generateClientAccessToken } from '../services/token.service';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';

/**
 * Login client
 * POST /api/client/auth/login
 */
export const loginClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const credentials = validateClientLogin(req.body);
    
    // Authenticate client
    const authResponse = await clientAuthService.loginClient(credentials);
    
    // TODO: Phase 0 Decision - Token storage method
    // If using HTTP-only cookies (recommended), set cookies here
    // If using localStorage, just return tokens in response
    
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
 * Refresh client access token
 * POST /api/client/auth/refresh
 */
export const refreshClientToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new ApiError(400, 'Refresh token is required');
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user to check if still active
    const user = await clientAuthService.getUserById(decoded.id);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or deactivated');
    }
    
    // Generate new access token
    const accessToken = generateClientAccessToken({
      id: user.id,
      email: user.email,
      role: 'CLIENT',
    });
    
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
 * Logout client
 * POST /api/client/auth/logout
 */
export const logoutClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Client ID should be attached by auth middleware
    const clientId = req.client?.id;
    
    if (clientId) {
      await clientAuthService.logoutClient(clientId);
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
 * Get current client profile
 * GET /api/client/auth/me
 */
export const getCurrentClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Client should be attached by auth middleware
    if (!req.client) {
      throw new ApiError(401, 'Not authenticated');
    }
    
    // Get fresh user data
    const user = await clientAuthService.getUserById(req.client.id);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
        },
        engagementId: req.client.engagementId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client's engagements
 * GET /api/client/auth/engagements
 */
export const getClientEngagements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Not authenticated');
    }
    
    const engagements = await clientAuthService.getUserEngagements(req.client.id);
    
    res.status(200).json({
      success: true,
      data: { engagements },
      count: engagements.length,
    });
  } catch (error) {
    next(error);
  }
};