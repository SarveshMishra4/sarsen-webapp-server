import { Request, Response, NextFunction } from 'express';
import { couponService } from './coupon.service.js';
import {
  createCouponSchema,
  updateCouponStatusSchema,
  validateCouponSchema,
} from './coupon.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const couponController = {

  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a safe fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid coupon data provided';
        throw new AppError(errorMessage, 400);
      }

      const coupon = await couponService.createCoupon(parsed.data);

      res.status(201).json(
        formatResponse(true, 'Coupon created successfully.', coupon)
      );
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateCouponStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a safe fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid status provided';
        throw new AppError(errorMessage, 400);
      }

      // FIX: Explicitly cast the URL param as a string
      const id = req.params.id as string;
      const coupon = await couponService.updateStatus(id, parsed.data.isActive);

      res.status(200).json(
        formatResponse(
          true,
          `Coupon ${parsed.data.isActive ? 'activated' : 'deactivated'} successfully.`,
          coupon
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = validateCouponSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a safe fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid validation data provided';
        throw new AppError(errorMessage, 400);
      }

      const result = await couponService.validateCoupon(
        parsed.data.code,
        parsed.data.serviceId
      );

      res.status(200).json(
        formatResponse(true, 'Coupon is valid.', result)
      );
    } catch (err) {
      next(err);
    }
  },

  async getAllCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupons = await couponService.getAllCoupons();

      res.status(200).json(
        formatResponse(true, 'Coupons retrieved.', {
          coupons,
          total: coupons.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },
};