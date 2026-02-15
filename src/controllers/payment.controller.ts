/**
 * Payment Controller
 * 
 * Handles HTTP requests for payment processing:
 * - Creating orders
 * - Verifying payments
 * - Webhook handling (future)
 */

import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import * as engagementService from '../services/engagement.service';
import { validateCreateOrder, validateVerifyPayment } from '../validators/payment.validator';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';

/**
 * Create a new payment order
 * POST /api/payments/create-order
 * Access: Public (used during checkout)
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request
    const orderData = validateCreateOrder(req.body);
    
    // Create order
    const result = await paymentService.createOrder(orderData);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: result.order,
        razorpayOrder: result.razorpayOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify payment and create engagement
 * POST /api/payments/verify
 * Access: Public (called by frontend after payment)
 */
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request
    const paymentData = validateVerifyPayment(req.body);
    
    // Verify payment
    const order = await paymentService.verifyPayment(paymentData);
    
    // Create engagement from payment
    const engagement = await engagementService.createEngagementFromPayment({
      orderId: order.orderId,
      email: order.email,
      serviceCode: order.serviceCode,
      userData: {
        firstName: order.firstName,
        lastName: order.lastName,
        company: order.company,
        phone: order.phone,
      },
    });
    
    logger.info(`Engagement created from payment: ${order.orderId}`);
    
    res.status(200).json({
      success: true,
      message: 'Payment verified and engagement created successfully',
      data: {
        order,
        engagement: {
          id: engagement.id,
          engagementId: engagement.engagementId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 * GET /api/admin/payments/orders/:orderId
 * Access: Admin only
 */
export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { orderId } = req.params;
    
    const order = await paymentService.getOrderById(orderId);
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders by email
 * GET /api/admin/payments/orders/email/:email
 * Access: Admin only
 */
export const getOrdersByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { email } = req.params;
    
    const orders = await paymentService.getOrdersByEmail(email);
    
    res.status(200).json({
      success: true,
      data: { orders },
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders (admin)
 * GET /api/admin/payments/orders
 * Access: Admin only
 */
export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.serviceCode) filters.serviceCode = req.query.serviceCode as string;
    
    const result = await paymentService.getAllOrders(page, limit, filters);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};