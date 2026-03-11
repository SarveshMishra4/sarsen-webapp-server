import mongoose from 'mongoose';
import { Coupon, ICoupon } from './coupon.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

// Import service model to verify serviceId exists at coupon creation time
import { Service } from '../services/services.model.js';

export const couponService = {

  async createCoupon(data: {
    code: string;
    price: number;
    serviceId: string;
    isActive: boolean;
    expiryDate: string;
  }): Promise<ICoupon> {
    // Verify the linked service actually exists
    if (!mongoose.Types.ObjectId.isValid(data.serviceId)) {
      throw new AppError('Invalid serviceId format', 400);
    }
    const service = await Service.findById(data.serviceId);
    if (!service) throw new AppError('Service not found', 404);

    const coupon = await Coupon.create({
      code:       data.code.toUpperCase().trim(),
      price:      data.price,
      serviceId:  data.serviceId,
      isActive:   data.isActive,
      expiryDate: new Date(data.expiryDate),
    });

    logger.info('[Coupons] New coupon created', {
      code:      coupon.code,
      serviceId: data.serviceId,
      price:     coupon.price,
    });

    return coupon;
  },

  async updateStatus(id: string, isActive: boolean): Promise<ICoupon> {
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );
    if (!coupon) throw new AppError('Coupon not found', 404);

    logger.info('[Coupons] Coupon status updated', { id, isActive });

    return coupon;
  },

  /**
   * validateCoupon
   *
   * Called during checkout to verify a coupon code before creating a Razorpay order.
   * Checks in order:
   *   1. Coupon code exists
   *   2. Coupon belongs to the requested service
   *   3. Coupon is active
   *   4. Coupon has not expired
   *
   * Returns the final price and coupon ID so the purchase flow can
   * store the couponId on the payment and engagement records.
   */
  async validateCoupon(
    code: string,
    serviceId: string
  ): Promise<{ finalPrice: number; couponId: string }> {
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      throw new AppError('Coupon code is invalid.', 400);
    }

    if (coupon.serviceId.toString() !== serviceId) {
      throw new AppError('This coupon is not valid for the selected service.', 400);
    }

    if (!coupon.isActive) {
      throw new AppError('This coupon is no longer active.', 400);
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      throw new AppError('This coupon has expired.', 400);
    }

    return {
      finalPrice: coupon.price,
      couponId:   coupon._id.toString(),
    };
  },

  async getAllCoupons(): Promise<ICoupon[]> {
    return Coupon.find()
      .populate('serviceId', 'title type')
      .sort({ createdAt: -1 });
  },
};
