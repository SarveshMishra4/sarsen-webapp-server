/**
 * Payment Service
 * 
 * Handles Razorpay payment integration:
 * - Creating orders
 * - Verifying payments
 * - Managing order records
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';
import { Order, IOrder, OrderStatus } from '../models/Order.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import { generateReceiptId } from '../utils/token.util'; // FIXED: Now this export exists

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

export interface CreateOrderInput {
  amount: number; // in paise
  currency?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  serviceCode: string;
  serviceName: string;
  couponCode?: string;
  discountAmount?: number;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Create a new Razorpay order
 * @param input - Order creation input
 * @returns Created order with Razorpay details
 */
export const createOrder = async (
  input: CreateOrderInput
): Promise<{ order: IOrder; razorpayOrder: any }> => {
  try {
    const {
      amount,
      currency = 'INR',
      email,
      firstName,
      lastName,
      company,
      phone,
      serviceCode,
      serviceName,
      couponCode,
      discountAmount = 0,
      metadata = {},
    } = input;
    
    // Calculate final amount after discount
    const finalAmount = amount - discountAmount;
    
    if (finalAmount <= 0) {
      throw new ApiError(400, 'Final amount must be greater than zero');
    }
    
    // Generate unique receipt ID
    const receipt = generateReceiptId();
    
    // Create order in Razorpay
    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount,
      currency,
      receipt,
      notes: {
        serviceCode,
        email,
        ...metadata,
      },
    });
    
    // Create order record in database
    const order = await Order.create({
      orderId: razorpayOrder.id,
      receipt,
      email,
      firstName,
      lastName,
      company,
      phone,
      serviceCode,
      serviceName,
      amount,
      currency,
      couponCode,
      discountAmount,
      finalAmount,
      status: 'PENDING',
      metadata,
    });
    
    logger.info(`Order created: ${razorpayOrder.id} for ${email}`);
    
    return {
      order,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      },
    };
  } catch (error) {
    logger.error('Error creating order:', error);
    throw new ApiError(500, 'Failed to create payment order');
  }
};

/**
 * Verify payment signature
 * @param input - Payment verification input
 * @returns Boolean indicating if signature is valid
 */
export const verifyPaymentSignature = (
  input: VerifyPaymentInput
): boolean => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    return expectedSignature === razorpay_signature;
  } catch (error) {
    logger.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Verify and process successful payment
 * @param input - Payment verification input
 * @returns Updated order
 */
export const verifyPayment = async (
  input: VerifyPaymentInput
): Promise<IOrder> => {
  const session = await Order.startSession();
  session.startTransaction();
  
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;
    
    // Find order
    const order = await Order.findOne({ orderId: razorpay_order_id }).session(session);
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    if (order.status !== 'PENDING') {
      throw new ApiError(400, `Order already ${order.status.toLowerCase()}`);
    }
    
    // Verify signature
    const isValid = verifyPaymentSignature(input);
    
    if (!isValid) {
      // Update order as failed
      order.status = 'FAILED';
      await order.save({ session });
      await session.commitTransaction();
      
      throw new ApiError(400, 'Invalid payment signature');
    }
    
    // Update order as paid
    order.status = 'PAID';
    order.paymentId = razorpay_payment_id;
    order.signature = razorpay_signature;
    order.paidAt = new Date();
    
    await order.save({ session });
    await session.commitTransaction();
    
    logger.info(`Payment verified for order: ${razorpay_order_id}`);
    
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get order by ID
 * @param orderId - Razorpay order ID
 * @returns Order
 */
export const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  try {
    return await Order.findOne({ orderId });
  } catch (error) {
    logger.error('Error fetching order:', error);
    throw new ApiError(500, 'Failed to fetch order');
  }
};

/**
 * Get orders by email
 * @param email - Customer email
 * @returns Array of orders
 */
export const getOrdersByEmail = async (email: string): Promise<IOrder[]> => {
  try {
    return await Order.find({ email }).sort({ createdAt: -1 });
  } catch (error) {
    logger.error('Error fetching orders by email:', error);
    throw new ApiError(500, 'Failed to fetch orders');
  }
};

/**
 * Get all orders for admin (with pagination)
 * @param page - Page number
 * @param limit - Items per page
 * @param filters - Optional filters
 * @returns Paginated orders
 */
export const getAllOrders = async (
  page: number = 1,
  limit: number = 20,
  filters: {
    status?: OrderStatus;
    serviceCode?: string;
  } = {}
): Promise<{ orders: IOrder[]; total: number; pages: number }> => {
  try {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.serviceCode) query.serviceCode = filters.serviceCode;
    
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query),
    ]);
    
    return {
      orders,
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Error fetching all orders:', error);
    throw new ApiError(500, 'Failed to fetch orders');
  }
};