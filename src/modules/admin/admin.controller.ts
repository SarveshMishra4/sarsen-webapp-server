import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service.js';
import { adminLoginSchema } from './admin.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const adminController = {

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = adminLoginSchema.safeParse(req.body);
      if (!parsed.success) {
throw new AppError(parsed.error.issues[0]?.message || 'Invalid input data', 400);      }

      const { email, password } = parsed.data;
      const result = await adminService.login(email, password);

      res.status(200).json(
        formatResponse(true, 'Login successful', result)
      );
    } catch (err) {
      next(err);
    }
  },

};
