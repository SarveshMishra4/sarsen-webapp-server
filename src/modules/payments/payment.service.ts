import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment } from './payment.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { env } from '../../core/config/env.js';
import mongoose from 'mongoose';

let razorpayInstance: Razorpay | null = null;

// ─── Razorpay singleton ───────────────────────────────────────────────────────
// We create the Razorpay instance once and reuse it.
// This avoids re-reading env variables on every request.

const getRazorpay = (): Razorpay => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id:     env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  serviceId:          string;
  couponId?:          string | undefined;
  finalAmountInPaise: number;
  purchaseAnswers?:   object;
  userEmail:          string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const paymentService = {

  /**
   * createOrder
   *
   * Creates a Razorpay order and immediately stores a PENDING Payment record.
   *
   * Why do we store a pending record BEFORE the user pays?
   * Because we need a paper trail. If the user pays but our server crashes
   * before we can record it, the pending record lets us reconcile later.
   *
   * The purchaseAnswers snapshot and userEmail are stored here so that
   * verifyPayment (or the webhook) can retrieve everything it needs
   * from a single Payment document — no need to carry data across requests.
   */
  async createOrder(input: CreateOrderInput): Promise<{ orderId: string; amount: number; currency: string }> {
    console.log("5. [PaymentService] Starting Razorpay order creation...");
    const razorpay = getRazorpay();

    // Step 1: Create the order on Razorpay's servers.
    // Razorpay returns an order ID that the frontend uses to open the payment modal.
    const order = await razorpay.orders.create({
      amount:   input.finalAmountInPaise,
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        // These notes are stored on Razorpay's side for reference.
        // They are NOT used for verification — we use our own Payment record for that.
        serviceId: input.serviceId,
        userEmail: input.userEmail,
      },
    });

    console.log("6. [PaymentService] Razorpay order created:", order.id);

    // Step 2: Build the Payment document to store in MongoDB.
    const paymentData: any = {
      razorpayOrderId: order.id,
      amount:          input.finalAmountInPaise,
      currency:        'INR',
      status:          'pending',           // Will become 'success' after verifyPayment
      serviceId:       new mongoose.Types.ObjectId(input.serviceId),
      userEmail:       input.userEmail,     // Stored at root level for easy access during fulfillment
      purchaseAnswers: input.purchaseAnswers || [],
    };

    // Only add couponId if it exists — Mongoose rejects { couponId: undefined }
    if (input.couponId) {
      paymentData.couponId = new mongoose.Types.ObjectId(input.couponId);
    }

    console.log("7. [PaymentService] Attempting Mongoose Payment.create with:", JSON.stringify(paymentData, null, 2));

    // Step 3: Save the pending record to MongoDB.
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
   * verifyPayment
   *
   * ─────────────────────────────────────────────────────────────────────────
   * THIS IS THE LOCALHOST-SAFE PAYMENT VERIFICATION METHOD.
   * ─────────────────────────────────────────────────────────────────────────
   *
   * Called from POST /payments/verify after the Razorpay modal fires its
   * handler callback on the frontend with the three payment identifiers.
   *
   * WHY THIS EXISTS:
   * The webhook (handleWebhook below) requires Razorpay's servers to call
   * your backend URL. On localhost, that URL is not publicly accessible,
   * so the webhook never fires. This method gives the frontend a way to
   * trigger fulfillment directly after payment — safely.
   *
   * HOW THE VERIFICATION WORKS (HMAC-SHA256):
   * Razorpay signs the payment by combining orderId + "|" + paymentId
   * and hashing it with your key_secret. We recreate that hash and compare.
   * If they match, we know Razorpay actually processed this payment.
   * Nobody can fake this without knowing your key_secret.
   *
   * WHAT HAPPENS AFTER VERIFICATION:
   * The pending Payment record is updated to 'success' and returned to the
   * controller, which then calls purchaseFlowService.fulfillAfterPayment
   * to create the user, engagement, and password.
   *
   * RELATIONSHIP TO WEBHOOK:
   * In production, both this endpoint AND the webhook may fire.
   * The fulfillAfterPayment function has an idempotency check — if the
   * engagement already exists it will not be created twice.
   */
  async verifyPayment(
    razorpayOrderId:   string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{ verified: boolean; paymentRecord: any }> {

    // Step 1: Recreate the HMAC signature using our key_secret.
    // Razorpay's signing format is always: orderId + "|" + paymentId
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // Step 2: Compare our signature with what Razorpay sent.
    // If they don't match, someone tampered with the request.
    if (expectedSignature !== razorpaySignature) {
      logger.warn('[Payment] verifyPayment — signature mismatch', { razorpayOrderId });
      throw new AppError('Payment verification failed — invalid signature', 400);
    }

    logger.info('[Payment] verifyPayment — signature valid', { razorpayOrderId, razorpayPaymentId });

    // Step 3: Find the pending Payment record and mark it as success.
    // We only update records with status: 'pending' to prevent re-processing
    // a payment that was already fulfilled (e.g. by a webhook).
    const paymentRecord = await Payment.findOneAndUpdate(
      { razorpayOrderId, status: 'pending' },
      {
        status:            'success',
        razorpayPaymentId,
        razorpaySignature,
      },
      { new: true } // Return the updated document, not the original
    );

    // If no pending record found, it was either already processed or doesn't exist.
    if (!paymentRecord) {
      logger.warn('[Payment] verifyPayment — no pending record found (may already be fulfilled)', {
        razorpayOrderId,
      });
      throw new AppError('Payment record not found or already processed', 404);
    }

    logger.info('[Payment] Payment marked as success via verify endpoint', {
      razorpayOrderId,
      razorpayPaymentId,
    });

    return { verified: true, paymentRecord };
  },

  /**
   * handleWebhook
   *
   * ─────────────────────────────────────────────────────────────────────────
   * THIS IS THE PRODUCTION WEBHOOK HANDLER — BACKUP TO verifyPayment.
   * ─────────────────────────────────────────────────────────────────────────
   *
   * Called server-to-server by Razorpay after a payment event.
   * Requires express.raw() on the route — the body must arrive as a Buffer
   * for HMAC verification to work. express.json() would break this.
   *
   * On localhost: Razorpay cannot reach localhost, so this never fires.
   * On production (Render/Railway): this is the primary fulfillment path.
   *
   * IDEMPOTENCY NOTE:
   * Razorpay may call the webhook more than once for the same event.
   * The findOneAndUpdate with status: 'pending' ensures we only process
   * each payment once. fulfillAfterPayment has its own idempotency check too.
   *
   * On payment.captured: marks payment success, returns paymentRecord for fulfillment.
   * On payment.failed: marks payment failed, stores the reason.
   * All other events: acknowledged silently with no action.
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string
  ): Promise<{ verified: boolean; event: string; paymentRecord?: any }> {

    // Step 1: Verify HMAC signature using the raw Buffer body.
    // WEBHOOK_SECRET is different from KEY_SECRET — set it in Razorpay dashboard.
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

    // ── payment.captured ──────────────────────────────────────────────────
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
        // This can happen if verifyPayment already processed it — that is fine.
        logger.warn('[Payment] Webhook: captured event but no pending record found (may already be fulfilled)', { orderId });
        return { verified: true, event };
      }

      logger.info('[Payment] Webhook: payment marked as success', { orderId, paymentId });
      return { verified: true, event, paymentRecord };
    }

    // ── payment.failed ────────────────────────────────────────────────────
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

      logger.warn('[Payment] Webhook: payment marked as failed', { orderId });
      return { verified: true, event };
    }

    // ── all other events — acknowledge and ignore ─────────────────────────
    return { verified: true, event };
  },

  /**
   * linkEngagementToPayment
   *
   * Called by purchaseFlowService after engagement + user are created.
   * Closes the loop — the payment record now points to the engagement.
   * This makes it easy to find a user's engagement from their payment record.
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