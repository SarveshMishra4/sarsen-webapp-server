import { Request, Response, NextFunction } from 'express';
import { identityService } from './identity.service.js';
import { loginSchema, resolveUserSchema } from './identity.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const identityController = {

  /**
   * POST /auth/login
   * Public. User logs in with email and password.
   * Returns JWT (30d) and sanitised user object.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a safe fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid login credentials';
        throw new AppError(errorMessage, 400);
      }

      const result = await identityService.login(parsed.data.email, parsed.data.password);

      res.status(200).json(
        formatResponse(true, 'Login successful.', result)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/resolve
   * Development/testing endpoint to manually trigger resolveOrCreateUser.
   * Simulates what the purchase flow calls after a successful payment.
   * Body: { email }
   *
   * Returns: { user, plainPassword (if new), isNew }
   *
   * NOTE: In production you may want to remove or gate this endpoint.
   * In the actual purchase flow this is called internally — not via HTTP.
   */
  async resolveOrCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = resolveUserSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a safe fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid request data';
        throw new AppError(errorMessage, 400);
      }

      const result = await identityService.resolveOrCreateUser(parsed.data.email);

      const message = result.isNew
        ? 'New user created. Save the password — it will not be shown again.'
        : 'Existing user found. No new password generated.';

      res.status(result.isNew ? 201 : 200).json(
        formatResponse(true, message, {
          user:          result.user,
          isNew:         result.isNew,
          // plainPassword only present on first creation
          ...(result.plainPassword && { plainPassword: result.plainPassword }),
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /auth/admin/users
   * Admin only. Returns all user accounts (no passwords).
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await identityService.getAllUsers();

      res.status(200).json(
        formatResponse(true, 'Users retrieved.', { users, total: users.length })
      );
    } catch (err) {
      next(err);
    }
  },
};