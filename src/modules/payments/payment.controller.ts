import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';
import { purchaseFlowService } from './purchaseFlow.service.js';
import { createOrderSchema } from './payment.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

export const paymentController = {

  /**
   * POST /payments/create-order
   * Auth: user JWT required
   *
   * Full flow:
   * 1. Validate request body
   * 2. purchaseFlowService validates service, resolves coupon, calculates price
   * 3. Razorpay order created and pending payment record stored
   * 4. Return orderId + amount to frontend for Razorpay SDK
   */
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      
      if (!parsed.success) {
        // FIXED: Using .issues with optional chaining and a fallback 
        // to satisfy both Zod typings and strict 'noUncheckedIndexedAccess'
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid input provided';
        throw new AppError(errorMessage, 400);
      }

      // Store userEmail inside purchaseAnswers wrapper so it travels
      // with the payment record and is available to fulfillAfterPayment
      
      // FIXED: Conditionally spreading optional properties to respect 'exactOptionalPropertyTypes: true'
      const orderInput = {
        serviceId:  parsed.data.serviceId,
        userEmail:  parsed.data.userEmail,
        ...(parsed.data.couponCode !== undefined && { couponCode: parsed.data.couponCode }),
        ...(parsed.data.purchaseAnswers !== undefined && { purchaseAnswers: parsed.data.purchaseAnswers }),
      };

      const result = await purchaseFlowService.createOrder(orderInput);

      res.status(200).json(
        formatResponse(true, 'Order created successfully.', result)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /payments/webhook
   * Called by Razorpay server-to-server — NOT by the frontend.
   *
   * CRITICAL: This route uses express.raw() — the body arrives as a Buffer.
   * express.json() must NOT run before this handler or signature verification fails.
   *
   * Always returns HTTP 200 to Razorpay regardless of outcome.
   * Razorpay retries on any non-200 response, causing duplicate fulfillments.
   * All errors are logged internally.
   *
   * On payment.captured:
   * - Verifies HMAC signature
   * - Marks payment as success
   * - Calls fulfillAfterPayment (creates user + engagement + purchase questionnaire)
   * - If new user: logs plainPassword (in production this goes to a notification or email)
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

        // If user is new, log the plain password.
        // In production: send via email or secure notification.
        // The password is never stored in plain text — this is the only moment it exists.
        if (fulfillResult.isNewUser && fulfillResult.plainPassword) {
          logger.info('[Webhook] NEW USER CREDENTIALS — deliver to user', {
            email:    fulfillResult.userEmail,
            password: fulfillResult.plainPassword,
          });
        }
      }

      if (result.event === 'payment.failed') {
        logger.warn('[Webhook] Payment failed recorded', {
          event: result.event,
        });
      }

      res.status(200).json({ received: true });
    } catch (err) {
      // Log the error but still return 200 to Razorpay
      logger.error('[Webhook] Error during webhook processing', err as Error);
      res.status(200).json({ received: true });
    }
  },
};