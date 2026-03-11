import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(1, 'Coupon code is required')
    .max(50, 'Coupon code is too long')
    .regex(/^[A-Z0-9_-]+$/i, 'Coupon code can only contain letters, numbers, hyphens, and underscores'),
  price: z
    // FIX: Replaced 'invalid_type_error' with 'message'
    .number({ message: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
  serviceId: z
    .string()
    .min(1, 'serviceId is required'),
  isActive: z
    .boolean()
    .default(true),
  expiryDate: z
    .string()
    .datetime({ message: 'expiryDate must be a valid ISO 8601 date string' }),
});

export const updateCouponStatusSchema = z.object({
  // FIX: Replaced 'invalid_type_error' with 'message'
  isActive: z.boolean({ message: 'isActive must be a boolean' }),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  serviceId: z.string().min(1, 'serviceId is required'),
});

export type CreateCouponInput       = z.infer<typeof createCouponSchema>;
export type UpdateCouponStatusInput = z.infer<typeof updateCouponStatusSchema>;
export type ValidateCouponInput     = z.infer<typeof validateCouponSchema>;