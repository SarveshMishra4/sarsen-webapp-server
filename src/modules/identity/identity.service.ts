import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User, IUser } from './identity.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { generateToken } from '../../core/utils/generateToken.js';
import { logger } from '../../core/logger/logger.js';

const SALT_ROUNDS = 12;

// Generates a random plain-text password that is readable and reasonably secure.
// Format: 3 segments of 4 uppercase alphanumeric characters joined by hyphens.
// Example: A3FX-9KPQ-2MZT
const generatePlainPassword = (): string => {
  return Array.from({ length: 3 }, () =>
    crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  ).join('-');
};

export const identityService = {

  /**
   * resolveOrCreateUser
   *
   * Core function called by the purchase flow after a payment is confirmed.
   * Never called directly by the user — only triggered server-side.
   *
   * Behaviour:
   * - If email is new: create user, hash password, return plainPassword once
   * - If email exists: return existing user silently, no password generated
   *
   * The plainPassword is shown ONCE on the payment success screen.
   * After that it is gone — only the bcrypt hash remains in the DB.
   */
  async resolveOrCreateUser(email: string): Promise<{
    user: IUser;
    plainPassword?: string;
    isNew: boolean;
  }> {
    const normalised = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalised });
    if (existing) {
      logger.info('[Identity] Existing user resolved', { email: normalised });
      return { user: existing, isNew: false };
    }

    const plainPassword  = generatePlainPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    const user = await User.create({ email: normalised, hashedPassword });

    logger.info('[Identity] New user created', { email: normalised });

    return { user, plainPassword, isNew: true };
  },

  /**
   * login
   *
   * Called from POST /auth/login.
   * Returns a 30-day JWT and sanitised user object.
   * Password is never included in the response.
   */
  async login(email: string, password: string): Promise<{ token: string; user: object }> {
    const normalised = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalised });
    if (!user) throw new AppError('Invalid credentials', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const token = generateToken(
      { id: user._id.toString(), role: 'user', email: user.email },
      '30d'
    );

    logger.info('[Identity] User logged in', { email: normalised });

    return { token, user: user.toJSON() };
  },

  /**
   * resetPassword
   *
   * Called by admin only (Stage 15).
   * Generates a new password, hashes it, replaces the stored hash.
   * Returns the plain password once for the admin to communicate to the user.
   */
  async resetPassword(userId: string): Promise<{ plainPassword: string }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const plainPassword  = generatePlainPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    user.hashedPassword = hashedPassword;
    await user.save();

    logger.info('[Identity] Password reset by admin', { userId });

    return { plainPassword };
  },

  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async getAllUsers(): Promise<IUser[]> {
    return User.find().sort({ createdAt: -1 }).select('-hashedPassword');
  },
};
