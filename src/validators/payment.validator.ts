/**
 * Payment Validators
 * 
 * Validates incoming request data for payment endpoints.
 */

import { ApiError } from '../middleware/error.middleware';

export interface CreateOrderRequest {
  amount: number;
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

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Validate create order request
 * @param body - Request body
 * @returns Validated order data
 */
export const validateCreateOrder = (body: any): CreateOrderRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate amount
  if (body.amount === undefined) {
    errors.push('Amount is required');
  } else if (typeof body.amount !== 'number') {
    errors.push('Amount must be a number');
  } else if (body.amount <= 0) {
    errors.push('Amount must be greater than zero');
  }

  // Validate currency (optional)
  if (body.currency !== undefined) {
    if (typeof body.currency !== 'string') {
      errors.push('Currency must be a string');
    } else if (!/^[A-Z]{3}$/.test(body.currency)) {
      errors.push('Currency must be a 3-letter ISO code (e.g., INR, USD)');
    }
  }

  // Validate email
  if (!body.email) {
    errors.push('Email is required');
  } else if (typeof body.email !== 'string') {
    errors.push('Email must be a string');
  } else {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(body.email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Validate optional fields
  if (body.firstName !== undefined && typeof body.firstName !== 'string') {
    errors.push('First name must be a string');
  }
  
  if (body.lastName !== undefined && typeof body.lastName !== 'string') {
    errors.push('Last name must be a string');
  }
  
  if (body.company !== undefined && typeof body.company !== 'string') {
    errors.push('Company must be a string');
  }
  
  if (body.phone !== undefined && typeof body.phone !== 'string') {
    errors.push('Phone must be a string');
  }

  // Validate serviceCode
  if (!body.serviceCode) {
    errors.push('Service code is required');
  } else if (typeof body.serviceCode !== 'string') {
    errors.push('Service code must be a string');
  }

  // Validate serviceName
  if (!body.serviceName) {
    errors.push('Service name is required');
  } else if (typeof body.serviceName !== 'string') {
    errors.push('Service name must be a string');
  }

  // Validate couponCode (optional)
  if (body.couponCode !== undefined && typeof body.couponCode !== 'string') {
    errors.push('Coupon code must be a string');
  }

  // Validate discountAmount (optional)
  if (body.discountAmount !== undefined) {
    if (typeof body.discountAmount !== 'number') {
      errors.push('Discount amount must be a number');
    } else if (body.discountAmount < 0) {
      errors.push('Discount amount cannot be negative');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    amount: body.amount,
    currency: body.currency || 'INR',
    email: body.email.toLowerCase().trim(),
    firstName: body.firstName?.trim(),
    lastName: body.lastName?.trim(),
    company: body.company?.trim(),
    phone: body.phone?.trim(),
    serviceCode: body.serviceCode.toUpperCase().trim(),
    serviceName: body.serviceName.trim(),
    couponCode: body.couponCode?.trim(),
    discountAmount: body.discountAmount || 0,
    metadata: body.metadata,
  };
};

/**
 * Validate verify payment request
 * @param body - Request body
 * @returns Validated payment data
 */
export const validateVerifyPayment = (body: any): VerifyPaymentRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate razorpay_order_id
  if (!body.razorpay_order_id) {
    errors.push('Razorpay order ID is required');
  } else if (typeof body.razorpay_order_id !== 'string') {
    errors.push('Razorpay order ID must be a string');
  }

  // Validate razorpay_payment_id
  if (!body.razorpay_payment_id) {
    errors.push('Razorpay payment ID is required');
  } else if (typeof body.razorpay_payment_id !== 'string') {
    errors.push('Razorpay payment ID must be a string');
  }

  // Validate razorpay_signature
  if (!body.razorpay_signature) {
    errors.push('Razorpay signature is required');
  } else if (typeof body.razorpay_signature !== 'string') {
    errors.push('Razorpay signature must be a string');
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    razorpay_order_id: body.razorpay_order_id,
    razorpay_payment_id: body.razorpay_payment_id,
    razorpay_signature: body.razorpay_signature,
  };
};