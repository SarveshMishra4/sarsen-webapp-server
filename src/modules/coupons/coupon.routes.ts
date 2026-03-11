import { Router } from 'express';
import { couponController } from './coupon.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// POST /coupons/admin — create a new coupon
router.post('/admin', requireAdmin, couponController.createCoupon);

// GET /coupons/admin — list all coupons with service details
router.get('/admin', requireAdmin, couponController.getAllCoupons);

// PATCH /coupons/admin/:id/status — activate or deactivate a coupon
router.patch('/admin/:id/status', requireAdmin, couponController.updateStatus);

// ─── Checkout Route ───────────────────────────────────────────────────────────

// POST /coupons/validate — public checkout step, validates code against serviceId
// Returns finalPrice and couponId if valid, error if not
router.post('/validate', couponController.validateCoupon);

export default router;
