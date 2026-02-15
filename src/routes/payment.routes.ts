/**
 * Payment Routes
 * 
 * Defines all payment-related endpoints.
 */

import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

/**
 * Public payment routes (no authentication required)
 * These are used during checkout flow
 */

// @route   POST /api/payments/create-order
// @desc    Create a new Razorpay order
// @access  Public
router.post('/payments/create-order', paymentController.createOrder);

// @route   POST /api/payments/verify
// @desc    Verify payment and create engagement
// @access  Public
router.post('/payments/verify', paymentController.verifyPayment);

/**
 * Admin-only payment routes
 */

// @route   GET /api/admin/payments/orders
// @desc    Get all orders with pagination and filters
// @access  Private (Admin only)
router.get('/admin/payments/orders', adminAuthMiddleware, paymentController.getAllOrders);

// @route   GET /api/admin/payments/orders/:orderId
// @desc    Get specific order by ID
// @access  Private (Admin only)
router.get('/admin/payments/orders/:orderId', adminAuthMiddleware, paymentController.getOrder);

// @route   GET /api/admin/payments/orders/email/:email
// @desc    Get orders by customer email
// @access  Private (Admin only)
router.get('/admin/payments/orders/email/:email', adminAuthMiddleware, paymentController.getOrdersByEmail);

export default router;