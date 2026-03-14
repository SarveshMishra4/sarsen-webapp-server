import { z } from 'zod';

/**
 * createOrderSchema
 *
 * Validates the body of POST /payments/create-order.
 *
 * FIELDS:
 * - serviceId:       MongoDB _id of the service being purchased (required)
 * - userEmail:       Email address entered by the user in the modal (required)
 * - couponCode:      Coupon code if applied — optional, may be undefined
 * - purchaseAnswers: Array of question/answer pairs from the intake form.
 *                    Optional — not all services have questions.
 *                    questionId and questionText use z.string() (not .min(1))
 *                    because empty strings are valid for optional questions.
 *                    answer uses z.string() — empty string is valid (unanswered optional question).
 */
export const createOrderSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  userEmail: z.string().email('A valid email is required'),
  couponCode: z.string().optional(),
  purchaseAnswers: z
    .array(
      z.object({
        questionId:   z.string(),   // Not .min(1) — empty string is acceptable
        questionText: z.string(),   // Not .min(1) — empty string is acceptable
        answer:       z.string(),   // Empty string is valid for optional questions
      })
    )
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * verifyPaymentSchema
 *
 * Validates the body of POST /payments/verify.
 *
 * These three values are returned by the Razorpay SDK in the handler callback
 * after the user completes payment in the Razorpay modal.
 *
 * FIELDS:
 * - razorpay_order_id:   The order ID we created in /payments/create-order
 * - razorpay_payment_id: Razorpay's unique ID for the completed payment
 * - razorpay_signature:  HMAC-SHA256 proof that Razorpay actually processed this
 *
 * All three are required. If any is missing, the verification cannot proceed.
 */
export const verifyPaymentSchema = z.object({
  razorpay_order_id:   z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature:  z.string().min(1, 'razorpay_signature is required'),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;