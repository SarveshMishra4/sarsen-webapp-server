/**
 * Client Authentication Service
 * 
 * Contains business logic for client authentication:
 * - Login validation (engagement-scoped)
 * - Session creation
 * - Engagement ownership verification
 */

import { User } from '../models/User.model';
import { comparePassword } from '../utils/password.util';
import { generateClientAccessToken, generateRefreshToken } from './token.service';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';

export interface ClientLoginCredentials {
  email: string;
  password: string;
  engagementId?: string; // Optional - if logging into specific engagement
}

export interface ClientAuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  engagementId?: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Authenticate client with email and password
 * @param credentials - Login credentials
 * @returns Auth response with user data and tokens
 */
export const loginClient = async (
  credentials: ClientLoginCredentials
): Promise<ClientAuthResponse> => {
  const { email, password, engagementId } = credentials;
  
  // Find user by email (explicitly select password since it's excluded by default)
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    logger.warn(`Login attempt with non-existent email: ${email}`);
    throw new ApiError(401, 'Invalid email or password');
  }
  
  // Check if user account is active
  if (!user.isActive) {
    logger.warn(`Login attempt on inactive account: ${email}`);
    throw new ApiError(403, 'Account is deactivated. Please contact support.');
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Invalid password attempt for user: ${email}`);
    throw new ApiError(401, 'Invalid email or password');
  }
  
  // If engagementId is provided, verify user has access to this engagement
  if (engagementId) {
    const hasEngagement = user.engagements.some(
      (id) => id.toString() === engagementId
    );
    
    if (!hasEngagement) {
      logger.warn(`User ${email} attempted to access unauthorized engagement: ${engagementId}`);
      throw new ApiError(403, 'You do not have access to this engagement');
    }
  }
  
  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();
  
  // Generate tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: 'CLIENT',
  };
  
  // Add engagementId to payload if provided
  const clientPayload = {
    ...tokenPayload,
    role: 'CLIENT' as const,
    engagementId: engagementId,
  };
  
  const accessToken = generateClientAccessToken(clientPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  
  logger.info(`Client logged in successfully: ${email}${engagementId ? ` to engagement: ${engagementId}` : ''}`);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
    },
    engagementId,
    accessToken,
    refreshToken,
  };
};

/**
 * Create a new client user account
 * Called automatically after successful payment in Phase 5
 * @param email - User email
 * @param password - Generated password
 * @param userData - Optional additional user data
 * @returns Created user (without password)
 */
export const createClientUser = async (
  email: string,
  password: string,
  userData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  }
): Promise<any> => {
  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      // User exists - return existing user
      logger.info(`Existing user found: ${email}`);
      return user;
    }
    
    // Hash password
    const { hashPassword } = await import('../utils/password.util');
    const hashedPassword = await hashPassword(password);
    
    // Create new user
    user = await User.create({
      email,
      password: hashedPassword,
      ...userData,
      isActive: true,
    });
    
    logger.info(`New client user created: ${email}`);
    return user; // Password excluded automatically by toJSON
  } catch (error) {
    logger.error('Error creating client user:', error);
    throw new ApiError(500, 'Failed to create user account');
  }
};

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User object or null
 */
export const getUserById = async (userId: string): Promise<any> => {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    logger.error('Error fetching user by ID:', error);
    throw new ApiError(500, 'Failed to fetch user');
  }
};

/**
 * Get user's engagements
 * @param userId - User ID
 * @returns Array of engagement IDs
 */
export const getUserEngagements = async (userId: string): Promise<string[]> => {
  try {
    const user = await User.findById(userId).select('engagements');
    return user?.engagements.map(id => id.toString()) || [];
  } catch (error) {
    logger.error('Error fetching user engagements:', error);
    throw new ApiError(500, 'Failed to fetch engagements');
  }
};

/**
 * Add engagement to user
 * Called after successful payment in Phase 5
 * @param userId - User ID
 * @param engagementId - Engagement ID to add
 */
export const addEngagementToUser = async (
  userId: string,
  engagementId: string
): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { engagements: engagementId } } // $addToSet prevents duplicates
    );
    logger.info(`Added engagement ${engagementId} to user ${userId}`);
  } catch (error) {
    logger.error('Error adding engagement to user:', error);
    throw new ApiError(500, 'Failed to add engagement to user');
  }
};

/**
 * Logout client (client-side only - token invalidation can be added later)
 * @param userId - User ID
 */
export const logoutClient = async (userId: string): Promise<void> => {
  // For now, just log the action
  logger.info(`Client logged out: ${userId}`);
  
  // TODO: Phase 4 Enhancement - Add token blacklist if needed
};