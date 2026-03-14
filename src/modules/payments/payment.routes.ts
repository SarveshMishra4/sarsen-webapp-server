import { Router } from 'express';
import express from 'express';
import { paymentController } from './payment.controller.js';
// import { requireUser } from '../../core/middleware/requireUser.js';

const router = Router();

/**
 * POST /payments/webhook
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CRITICAL: express.raw() is applied HERE on this specific route.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Razorpay signature verification requires the EXACT raw bytes of the body.
 * If express.json() runs first, it parses the body into a JavaScript object
 * and destroys the raw bytes — the HMAC check will always fail after that.
 *
 * By placing express.raw() as middleware on this specific route, we ensure
 * the body arrives as a Buffer to the webhook handler.
 *
 * On localhost: Razorpay cannot reach localhost, so this never fires.
 * On production (Render/Railway): this is the primary fulfillment path.
 *
 * DO NOT reorder this route or remove express.raw() without understanding
 * the HMAC verification requirement.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.webhook
);

/**
 * POST /payments/create-order
 * Auth: requireUser is commented out during development — re-enable for production.
 *
 * Body: { serviceId, userEmail, couponCode?, purchaseAnswers? }
 * Returns: { orderId, amount, currency, keyId, serviceTitle }
 *
 * The frontend uses orderId and keyId to open the Razorpay payment modal.
 */
router.post(
  '/create-order',
  // requireUser,  ← uncomment when user auth is ready
  paymentController.createOrder
);

/**
 * POST /payments/verify
 * Auth: none — the Razorpay HMAC signature IS the proof of payment
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS IS THE LOCALHOST-SAFE PAYMENT VERIFICATION ENDPOINT.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHEN TO CALL THIS:
 * After the Razorpay modal fires its handler callback, the frontend sends
 * the three Razorpay payment identifiers here immediately.
 *
 * Body: {
 *   razorpay_order_id:   string  — the order ID from create-order
 *   razorpay_payment_id: string  — Razorpay's ID for the completed payment
 *   razorpay_signature:  string  — HMAC-SHA256 proof from Razorpay
 * }
 *
 * Returns: {
 *   engagementId:  string   — the created engagement ID
 *   isNewUser:     boolean  — true if this email had no account before
 *   plainPassword: string | null — the generated password (new users only,
 *                                  shown once on success screen, never stored)
 * }
 *
 * WHAT HAPPENS SERVER-SIDE:
 * 1. Signature is verified against RAZORPAY_KEY_SECRET
 * 2. Payment record is updated to 'success'
 * 3. User account is created (or existing user is resolved)
 * 4. Engagement is created with checklist from the service
 * 5. PurchaseQuestionnaire is stored
 * 6. plainPassword is returned (new users only)
 */
router.post(
  '/verify',
  paymentController.verifyPayment
);

export default router;