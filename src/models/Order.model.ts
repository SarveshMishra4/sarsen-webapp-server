/**
 * Order Model
 * 
 * Tracks payment orders created via Razorpay.
 * An order is created before payment and updated after successful verification.
 * Successful orders trigger engagement creation.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface IOrder extends Document {
  // Order identification
  orderId: string; // Razorpay order ID
  receipt: string; // Our internal receipt ID
  
  // Customer details
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  
  // Service details
  serviceCode: string;
  serviceName: string;
  amount: number; // in paise (Razorpay uses smallest currency unit)
  currency: string;
  
  // Coupon/discount
  couponCode?: string;
  discountAmount?: number;
  finalAmount: number;
  
  // Status tracking
  status: OrderStatus;
  paymentId?: string; // Razorpay payment ID after success
  signature?: string; // Razorpay signature for verification
  
  // Relationships
  userId?: mongoose.Types.ObjectId; // Created user (if new)
  engagementId?: mongoose.Types.ObjectId; // Created engagement (if successful)
  
  // Metadata
  metadata?: Map<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      unique: true,
      trim: true,
    },
    receipt: {
      type: String,
      required: [true, 'Receipt ID is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    serviceCode: {
      type: String,
      required: [true, 'Service code is required'],
      uppercase: true,
      trim: true,
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    couponCode: {
      type: String,
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      required: true,
    },
    paymentId: {
      type: String,
      trim: true,
    },
    signature: {
      type: String,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ receipt: 1 });
OrderSchema.index({ email: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ engagementId: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);