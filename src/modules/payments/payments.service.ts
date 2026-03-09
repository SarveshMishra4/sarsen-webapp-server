/**
 * FILE: modules/payments/payments.service.ts
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import { ENV } from "../../core/config/env.js";

import {
  createPaymentRecord,
  markPaymentSuccess,
} from "./payments.model.js";

import { ServiceModel } from "../services/services.model.js";

const razorpay = new Razorpay({
  key_id: ENV.RAZORPAY_KEY_ID,
  key_secret: ENV.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order
 */
export const createPaymentOrder = async (serviceId: string) => {

  const service = await ServiceModel.findById(serviceId);

  if (!service) {
    throw new Error("Service not found");
  }

  const order = await razorpay.orders.create({
    amount: service.price * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });

  await createPaymentRecord(
    serviceId,
    order.id,
    service.price
  );

  return order;
};

/**
 * Verify payment signature
 */
export const verifyPayment = async (
  orderId: string,
  paymentId: string,
  signature: string
) => {

  const body = orderId + "|" + paymentId;

  const expectedSignature = crypto
    .createHmac("sha256", ENV.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    throw new Error("Invalid payment signature");
  }

  return markPaymentSuccess(orderId, paymentId, signature);
};