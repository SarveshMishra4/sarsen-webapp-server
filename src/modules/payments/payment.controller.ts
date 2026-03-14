import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import { purchaseFlowService } from './purchaseFlow.service.js';
import { createOrderSchema, verifyPaymentSchema } from './payment.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { env } from '../../core/config/env.js';

export const paymentController = {

  /**
   * POST /payments/create-order
   * Auth: optional (requireUser commented out during development)
   *
   * WHAT THIS DOES:
   * 1. Validates the request body with Zod
   * 2. purchaseFlowService checks the service is active, resolves the coupon,
   *    calculates the final price in paise
   * 3. Razorpay order is created and a PENDING Payment record is stored in MongoDB
   * 4. Returns orderId + amount + keyId to the frontend
   *
   * WHAT THE FRONTEND DOES WITH THE RESPONSE:
   * Opens the Razorpay modal using the orderId and keyId.
   * After the user pays, Razorpay fires the handler callback with three values:
   *   razorpay_order_id, razorpay_payment_id, razorpay_signature
   * The frontend then calls POST /payments/verify with those three values.
   */
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log("1. [Controller] Request received body:", JSON.stringify(req.body, null, 2));

    try {
      const parsed = createOrderSchema.safeParse(req.body);

      if (!parsed.success) {
        console.error("2. [Controller] Zod Validation Failed:", parsed.error.format());
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      console.log("3. [Controller] Validation Success. Calling purchaseFlowService...");
      const result = await purchaseFlowService.createOrder(parsed.data);

      console.log("4. [Controller] Service returned result. Sending 200 OK.");
      res.status(200).json(
        formatResponse(true, 'Order created successfully.', {
          ...result,
          keyId: env.RAZORPAY_KEY_ID,
        })
      );
    } catch (err: any) {
      console.error("❌ [Controller] CRASH DETECTED:");
      console.error("FULL ERROR:", JSON.stringify(err, null, 2));
      console.error("ERROR KEYS:", Object.keys(err));

      res.status(err.statusCode || 500).json({
        success: false,
        message: err.error?.description || err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      });
    }
  },

  /**
   * POST /payments/verify
   * Auth: none required — the Razorpay signature IS the proof of payment
   *
   * ─────────────────────────────────────────────────────────────────────────
   * THIS IS THE CORE OF THE LOCALHOST-SAFE PAYMENT FLOW.
   * ─────────────────────────────────────────────────────────────────────────
   *
   * WHEN THIS IS CALLED:
   * After the user completes payment in the Razorpay modal, Razorpay fires
   * the handler callback on the frontend with three values:
   *   razorpay_order_id    — the order we created
   *   razorpay_payment_id  — Razorpay's unique ID for this payment
   *   razorpay_signature   — HMAC-SHA256 proof that Razorpay processed it
   *
   * The frontend sends these three values here immediately.
   *
   * WHAT THIS DOES:
   * 1. Validates input with Zod
   * 2. paymentService.verifyPayment checks the HMAC signature
   * 3. Payment record is updated to 'success' in MongoDB
   * 4. purchaseFlowService.fulfillAfterPayment:
   *    - Creates or finds the user account
   *    - Generates a password (new users only)
   *    - Creates the Engagement with checklist
   *    - Stores the PurchaseQuestionnaire
   *    - Links everything back to the Payment record
   * 5. Returns the plainPassword (new users only) to show on the success screen
   *
   * SECURITY NOTE:
   * The HMAC signature verification in paymentService.verifyPayment ensures
   * that this endpoint cannot be called with fake data. You must have the
   * actual Razorpay payment IDs + our key_secret to produce a valid signature.
   *
   * RELATIONSHIP TO WEBHOOK:
   * In production, both this AND the webhook may run for the same payment.
   * fulfillAfterPayment has an idempotency check — it will not create
   * duplicate users, engagements, or questionnaires.
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    console.log("V1. [Controller] verifyPayment called with:", JSON.stringify(req.body, null, 2));

    try {
      // Step 1: Validate the three required fields from Razorpay
      const parsed = verifyPaymentSchema.safeParse(req.body);

      if (!parsed.success) {
        console.error("V2. [Controller] verifyPayment Zod Validation Failed:", parsed.error.format());
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

      console.log("V3. [Controller] Calling paymentService.verifyPayment...");

      // Step 2: Verify the HMAC signature and mark payment as success
      const { paymentRecord } = await paymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      console.log("V4. [Controller] Signature valid. Calling purchaseFlowService.fulfillAfterPayment...");

      // Step 3: Run the full fulfillment — user, engagement, password, questionnaire
      const fulfillResult = await purchaseFlowService.fulfillAfterPayment(paymentRecord);

      console.log("V5. [Controller] Fulfillment complete:", {
        engagementId: fulfillResult.engagementId,
        userId:       fulfillResult.userId,
        isNewUser:    fulfillResult.isNewUser,
      });

      // Step 4: If the user is new, log their credentials.
      // In production: send these via email. For now they are returned to the frontend
      // for display on the success screen — this is the ONLY time the plain password exists.
      if (fulfillResult.isNewUser && fulfillResult.plainPassword) {
        logger.info('[Verify] NEW USER CREDENTIALS — show on success screen once', {
          email:    fulfillResult.userEmail,
          password: fulfillResult.plainPassword,
        });
      }

      // Step 5: Return the result.
      // plainPassword is only included if the user is new — undefined for existing users.
      res.status(200).json(
        formatResponse(true, 'Payment verified and account created successfully.', {
          engagementId:  fulfillResult.engagementId,
          isNewUser:     fulfillResult.isNewUser,
          // Only send plainPassword if it exists — existing users get undefined here
          plainPassword: fulfillResult.plainPassword ?? null,
        })
      );

    } catch (err: any) {
      console.error("❌ [Controller] verifyPayment CRASH:");
      console.error("FULL ERROR:", JSON.stringify(err, null, 2));
      next(err); // Pass to global errorHandler for consistent error responses
    }
  },

  /**
   * POST /payments/webhook
   * Called by Razorpay server-to-server — NOT by the frontend.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * CRITICAL: This route uses express.raw() — body arrives as a Buffer.
   * express.json() must NOT run before this handler or signature verification fails.
   * See payment.routes.ts for how this is handled.
   * ─────────────────────────────────────────────────────────────────────────
   *
   * Always returns HTTP 200 to Razorpay regardless of outcome.
   * Razorpay retries on any non-200 response, causing duplicate fulfillments.
   * All errors are caught and logged internally — never propagated.
   *
   * On localhost: this webhook will never be called (Razorpay cannot reach localhost).
   * On production (Render): this is the primary fulfillment path and verifyPayment
   * acts as a backup — fulfillAfterPayment's idempotency check prevents duplicates.
   */
  async webhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        logger.warn('[Webhook] Request received with no signature — ignored');
        res.status(200).json({ received: true });
        return;
      }

      const result = await paymentService.handleWebhook(req.body as Buffer, signature);

      if (result.event === 'payment.captured' && result.paymentRecord) {
        const fulfillResult = await purchaseFlowService.fulfillAfterPayment(result.paymentRecord);

        logger.info('[Webhook] Fulfillment complete', {
          engagementId: fulfillResult.engagementId,
          userId:       fulfillResult.userId,
          isNewUser:    fulfillResult.isNewUser,
        });

        // Log the plain password for new users.
        // In production: send via email or secure notification service.
        // The password is never stored in plain text — this is the only moment it exists.
        if (fulfillResult.isNewUser && fulfillResult.plainPassword) {
          logger.info('[Webhook] NEW USER CREDENTIALS — deliver to user', {
            email:    fulfillResult.userEmail,
            password: fulfillResult.plainPassword,
          });
        }
      }

      if (result.event === 'payment.failed') {
        logger.warn('[Webhook] Payment failed recorded', { event: result.event });
      }

      res.status(200).json({ received: true });

    } catch (err) {
      // Log the error but ALWAYS return 200 to Razorpay.
      // A non-200 causes Razorpay to retry, which can cause duplicate fulfillments.
      logger.error('[Webhook] Error during webhook processing', err as Error);
      res.status(200).json({ received: true });
    }
  },
};