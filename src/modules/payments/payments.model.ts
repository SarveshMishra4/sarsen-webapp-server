/**
 * FILE: modules/payments/payments.model.ts
 *
 * PURPOSE
 * Stores payment transactions.
 */

import mongoose, { Types } from "mongoose";

export interface PaymentRecord {
  _id?: Types.ObjectId | string;
  serviceId: Types.ObjectId; // <-- Updated to Types.ObjectId
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  status: "CREATED" | "PAID" | "FAILED";
  createdAt: Date;
}

const paymentSchema = new mongoose.Schema<PaymentRecord>({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },

  razorpayOrderId: {
    type: String,
    required: true,
  },

  razorpayPaymentId: {
    type: String,
  },

  razorpaySignature: {
    type: String,
  },

  amount: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["CREATED", "PAID", "FAILED"],
    default: "CREATED",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const PaymentModel = mongoose.model<PaymentRecord>(
  "Payment",
  paymentSchema
);

/**
 * Save payment order
 */
export const createPaymentRecord = async (
  serviceId: string | Types.ObjectId, // <-- Updated to accept both string and ObjectId
  orderId: string,
  amount: number
) => {
  return PaymentModel.create({
    serviceId,
    razorpayOrderId: orderId,
    amount,
  });
};

/**
 * Mark payment successful
 */
export const markPaymentSuccess = async (
  orderId: string,
  paymentId: string,
  signature: string
) => {
  return PaymentModel.findOneAndUpdate(
    { razorpayOrderId: orderId },
    {
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: "PAID",
    },
    { new: true }
  );
};