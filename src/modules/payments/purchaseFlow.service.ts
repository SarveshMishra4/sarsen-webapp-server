/**
 * purchaseFlow.service.ts
 *
 * Orchestrates the full purchase pipeline.
 *
 * Two responsibilities:
 *
 * 1. createOrder (called from payment controller on checkout)
 * - Validates service is active
 * - Validates and resolves coupon if provided
 * - Calculates final price server-side
 * - Delegates to paymentService.createOrder to create Razorpay order
 *
 * 2. fulfillAfterPayment (called from webhook controller on payment.captured)
 * - Resolves or creates the user account
 * - Creates the Engagement with checklist copied from the service
 * - Stores the PurchaseQuestionnaire
 * - Links engagementId and userId back to the Payment record
 * - Returns plainPassword if user is new (shown once on success page)
 *
 * This service is the only place that knows about the full purchase sequence.
 * paymentService knows only about Razorpay. identityService knows only about
 * users. They never call each other — purchaseFlow orchestrates both.
 */

import { Service } from '../services/services.model.js';
import { Coupon } from '../coupons/coupon.model.js';
import { Engagement } from '../engagements/engagement.model.js';
import { PurchaseQuestionnaire } from '../engagements/purchaseQuestionnaire.model.js';
import { identityService } from '../identity/identity.service.js';
import { paymentService } from './payment.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { IPayment } from './payment.model.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseAnswer {
  questionId: string;
  questionText: string;
  answer: string;
}

export interface CreateOrderInput {
  serviceId: string;
  userEmail: string;
  couponCode?: string | undefined;
  purchaseAnswers?: PurchaseAnswer[] | undefined;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  serviceTitle: string;
}

export interface FulfillResult {
  engagementId: string;
  userId: string;
  userEmail: string;
  isNewUser: boolean;
  plainPassword?: string; // Only present if new user — shown once
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const purchaseFlowService = {

  /**
   * createOrder
   *
   * Called from POST /payments/create-order.
   * Validates inputs, calculates final price, creates Razorpay order.
   * Returns order details to frontend for Razorpay SDK initialisation.
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const service = await Service.findById(input.serviceId);
    if (!service) throw new AppError('Service not found', 404);
    if (!service.isActive) throw new AppError('This service is not currently available', 400);

    let finalPrice = service.price;
    let resolvedCouponId: string | undefined;

    if (input.couponCode) {
      const coupon = await Coupon.findOne({
        code: input.couponCode.toUpperCase().trim(),
        serviceId: input.serviceId,
        isActive: true
      });

      if (coupon && new Date() <= new Date(coupon.expiryDate)) {
        finalPrice = coupon.price;
        resolvedCouponId = coupon._id.toString();
      }
      // If code was sent but invalid, we continue with base price or throw error per your preference
    }

    const finalAmountInPaise = Math.round(finalPrice);

    // MATCHING THE BIBLE: Use the email and answers exactly as sent
    const order = await paymentService.createOrder({
      serviceId: input.serviceId,
      couponId: resolvedCouponId,
      finalAmountInPaise: finalAmountInPaise,
      userEmail: input.userEmail,
      purchaseAnswers: input.purchaseAnswers || [],
    });

    return {
      orderId: order.orderId,
      amount: finalAmountInPaise,
      currency: 'INR',
      serviceTitle: service.title,
    };
  },

  /**
   * fulfillAfterPayment
   *
   * Called from POST /payments/webhook after Razorpay confirms payment.captured.
   * This is the most critical function in the system — it creates everything
   * that the user needs after paying.
   *
   * Steps:
   * 1. Fetch the service to get the defaultChecklist
   * 2. Resolve or create the user account
   * 3. Create the Engagement with the checklist copied from the service
   * 4. Store the PurchaseQuestionnaire if answers were provided
   * 5. Link engagementId + userId back to the Payment record
   * 6. Return plainPassword if this was a new user
   *
   * Idempotency: if an engagement already exists for this payment,
   * skip creation and return the existing one. Razorpay may fire
   * the webhook more than once.
   */
  async fulfillAfterPayment(paymentRecord: IPayment): Promise<FulfillResult> {
    logger.info('[PurchaseFlow] Fulfilling after payment', {
      paymentId: paymentRecord._id.toString(),
      orderId: paymentRecord.razorpayOrderId,
    });

    // ── Idempotency check ──────────────────────────────────────────────────
    // If engagement already exists for this payment, return early
    if (paymentRecord.engagementId) {
      logger.warn('[PurchaseFlow] Payment already fulfilled — skipping duplicate webhook', {
        orderId: paymentRecord.razorpayOrderId,
        engagementId: paymentRecord.engagementId.toString(),
      });

      const existingEngagement = await Engagement.findById(paymentRecord.engagementId);
      return {
        engagementId: paymentRecord.engagementId.toString(),
        userId: paymentRecord.userId!.toString(),
        userEmail: existingEngagement?.userId.toString() ?? '',
        isNewUser: false,
      };
    }

    // ── Step 1: Fetch service for checklist ────────────────────────────────
    const service = await Service.findById(paymentRecord.serviceId);
    if (!service) {
      logger.error('[PurchaseFlow] Service not found during fulfillment', {
        serviceId: paymentRecord.serviceId.toString(),
      });
      throw new AppError('Service not found during fulfillment', 500);
    }

    // ── Step 2: Get userEmail from payment notes ───────────────────────────
    // The email was stored in purchaseAnswers or must come from the payment record.
    // We stored it via Razorpay order notes — retrieve it from the payment notes field.
    // Since we store purchaseAnswers on the payment, we pull email from there or
    // fall back to looking up via razorpay order. For now we require it was stored.
    const purchaseAnswers = paymentRecord.purchaseAnswers as any;
    // Cast to any to bypass the missing property check
    const userEmail = (paymentRecord as any).userEmail as string;
    if (!userEmail) {
      logger.error('[PurchaseFlow] No userEmail found on payment record', {
        paymentId: paymentRecord._id.toString(),
      });
      throw new AppError('Cannot fulfill payment — user email missing from payment record', 500);
    }

    // ── Step 3: Resolve or create user ────────────────────────────────────
    const { user, plainPassword, isNew } = await identityService.resolveOrCreateUser(userEmail);

    // ── Step 4: Copy checklist from service into engagement ────────────────
    const engagementChecklist = service.defaultChecklist.map((step) => ({
      stepId: step.stepId,
      title: step.title,
      order: step.order,
      isCompleted: false,
    }));

    // ── Step 5: Create engagement ──────────────────────────────────────────
    // FIXED: Conditionally spreading couponId to avoid strict TS 'never' generic inference
    // FIXED: Cast user to `any` to access `_id` and bypass missing interface property
    const engagement = await Engagement.create({
      userId: (user as any)._id,
      serviceId: paymentRecord.serviceId,
      ...(paymentRecord.couponId !== undefined && { couponId: paymentRecord.couponId }),
      status: 'ongoing',
      engagementChecklist,
      progressPercent: 0,
      canDeliver: false,
    });

    logger.info('[PurchaseFlow] Engagement created', {
      engagementId: engagement._id.toString(),
      userId: (user as any)._id.toString(),
      serviceId: paymentRecord.serviceId.toString(),
    });

// ── Step 6: Store purchase questionnaire ───────────────────────────────────
// FIELD NAME MAPPING:
// Frontend sends and Payment record stores: { questionId, questionText, answer }
// PurchaseQuestionnaire model requires:     { questionKey, questionLabel, answer }
// We remap here before saving.
const rawAnswers = Array.isArray(purchaseAnswers) ? purchaseAnswers : [];

if (rawAnswers.length > 0) {
  const mappedAnswers = rawAnswers.map((a: any) => ({
    questionKey:   a.questionId   || a.questionKey   || '',
    questionLabel: a.questionText || a.questionLabel || '',
    answer:        a.answer       || '',
  }));

  await PurchaseQuestionnaire.create({
    engagementId: engagement._id,
    answers:      mappedAnswers,
    submittedAt:  new Date(),
  });

  logger.info('[PurchaseFlow] Purchase questionnaire stored', {
    engagementId: engagement._id.toString(),
    answerCount:  mappedAnswers.length,
  });
}

    // ── Step 7: Link engagement + user back to payment record ──────────────
    // FIXED: Cast user to `any` to access `_id`
    await paymentService.linkEngagementToPayment(
      paymentRecord.razorpayOrderId,
      engagement._id.toString(),
      (user as any)._id.toString()
    );

    // ── Step 8: Notify admin & user ─────────────────────────────────────────
    // Notify admin of new engagement
    notificationService.createNotification({
      recipientId: 'admin-global',
      recipientRole: 'admin',
      type: 'new_engagement',
      message: `New engagement created for ${userEmail} — ${service.title}.`,
      engagementId: engagement._id.toString(),
    });

    // Notify user of payment success
    notificationService.createNotification({
      // FIXED: Cast user to `any` to access `_id`
      recipientId: (user as any)._id.toString(),
      recipientRole: 'user',
      type: 'payment_success',
      message: `Payment confirmed. Your engagement for ${service.title} has started.`,
      engagementId: engagement._id.toString(),
    });

    return {
      engagementId: engagement._id.toString(),
      userId: (user as any)._id.toString(),
      userEmail,
      isNewUser: isNew,
      ...(plainPassword && { plainPassword }),
    };
  },
};