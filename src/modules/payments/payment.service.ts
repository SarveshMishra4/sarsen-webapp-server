import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment } from './payment.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { env } from '../../core/config/env.js';
import mongoose from 'mongoose';

let razorpayInstance: Razorpay | null = null;

const getRazorpay = (): Razorpay => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id:     env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

export interface CreateOrderInput {
  serviceId:          string;
  couponId?:          string | undefined;
  finalAmountInPaise: number;
  purchaseAnswers?:   object;
  userEmail:          string;
}

export const paymentService = {

  /**
   * createOrder
   *
   * Creates a Razorpay order and immediately stores a pending Payment record.
   * The pending record is the paper trail — it exists before the user pays.
   * The purchaseAnswers snapshot (including userEmail) is stored here so
   * fulfillAfterPayment can retrieve everything it needs from one document.
   */
// payment.service.ts

async createOrder(input: CreateOrderInput): Promise<{ orderId: string; amount: number; currency: string }> {
  console.log("5. [PaymentService] Starting Razorpay order creation...");
  const razorpay = getRazorpay();

  const order = await razorpay.orders.create({
    amount:   input.finalAmountInPaise,
    currency: 'INR',
    receipt:  `rcpt_${Date.now()}`,
    notes: {
      serviceId: input.serviceId,
      userEmail: input.userEmail,
    },
  });

  console.log("6. [PaymentService] Razorpay order created:", order.id);

  const paymentData: any = {
    razorpayOrderId: order.id,
    amount:          input.finalAmountInPaise,
    currency:        'INR',
    status:          'pending',
    serviceId:       new mongoose.Types.ObjectId(input.serviceId),
   userEmail:       input.userEmail,          // <--- Move to root level
  purchaseAnswers: input.purchaseAnswers || [], // <--- Keep as a clean array
  };

  if (input.couponId) {
    paymentData.couponId = new mongoose.Types.ObjectId(input.couponId);
  }

  console.log("7. [PaymentService] Attempting Mongoose Payment.create with:", JSON.stringify(paymentData, null, 2));

  try {
    const savedPayment = await Payment.create(paymentData);
    console.log("8. [PaymentService] Mongoose Save Success! ID:", savedPayment._id);
  } catch (dbErr: any) {
    console.error("🚨 [PaymentService] MONGOOSE CRASH:");
    console.error(dbErr);
    throw dbErr; // Re-throw so the controller catch block sees it
  }

  return { orderId: order.id, amount: input.finalAmountInPaise, currency: 'INR' };
},

  /**
   * handleWebhook
   *
   * Verifies Razorpay HMAC signature using the raw Buffer body.
   * Must be called before express.json() parses the body — use express.raw() on this route.
   *
   * On payment.captured: marks payment success and returns the paymentRecord
   * for fulfillAfterPayment to consume.
   * On payment.failed: marks payment failed and stores the reason.
   * All other events: acknowledged with no action.
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string
  ): Promise<{ verified: boolean; event: string; paymentRecord?: any }> {
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('[Payment] Webhook signature mismatch — request ignored');
      throw new AppError('Invalid webhook signature', 400);
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event: string = payload.event;

    logger.info('[Payment] Webhook received', { event });

    if (event === 'payment.captured') {
      const rzpPayment = payload.payload.payment.entity;
      const orderId:    string = rzpPayment.order_id;
      const paymentId:  string = rzpPayment.id;

      const paymentRecord = await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId, status: 'pending' },
        {
          status:            'success',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
        { new: true }
      );

      if (!paymentRecord) {
        logger.warn('[Payment] Captured event but no pending record found', { orderId });
        return { verified: true, event };
      }

      logger.info('[Payment] Payment marked as success', {
        orderId,
        paymentId,
      });

      return { verified: true, event, paymentRecord };
    }

    if (event === 'payment.failed') {
      const rzpPayment = payload.payload.payment.entity;
      const orderId: string = rzpPayment.order_id;

      await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId, status: 'pending' },
        {
          status:        'failed',
          failureReason: rzpPayment.error_description ?? 'Payment failed',
        }
      );

      logger.warn('[Payment] Payment marked as failed', { orderId });

      return { verified: true, event };
    }

    return { verified: true, event };
  },

  /**
   * linkEngagementToPayment
   *
   * Called by purchaseFlowService after engagement + user are created.
   * Closes the loop — the payment record now points to the engagement.
   */
  async linkEngagementToPayment(
    razorpayOrderId: string,
    engagementId:    string,
    userId:          string
  ): Promise<void> {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { engagementId, userId }
    );

    logger.info('[Payment] Payment linked to engagement', {
      razorpayOrderId,
      engagementId,
      userId,
    });
  },
};