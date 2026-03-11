import { Router } from 'express';
import express from 'express';
import { paymentController } from './payment.controller.js';
// import { requireUser } from '../../core/middleware/requireUser.js';

const router = Router();

/**
 * POST /payments/webhook
 *
 * CRITICAL: express.raw() must run here BEFORE express.json() in app.ts.
 * Razorpay signature verification requires the raw Buffer body.
 * app.ts registers this path with express.raw() before the global json parser.
 * Do not reorder these without reading app.ts first.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.webhook
);

/**
 * POST /payments/create-order
 * User JWT required.
 * Body: { serviceId, userEmail, couponCode?, purchaseAnswers? }
 * Returns: { orderId, amount, currency, serviceTitle }
 */
router.post('/create-order', /*{requireUser},*/ paymentController.createOrder);

export default router;
