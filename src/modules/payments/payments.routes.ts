/**
 * FILE: modules/payments/payments.routes.ts
 */

import { Router } from "express";

import {
  createOrderController,
  verifyPaymentController,
} from "./payments.controller.js";

const router = Router();

/**
 * Create payment order
 */
router.post("/create-order", createOrderController);

/**
 * Verify payment
 */
router.post("/verify", verifyPaymentController);

export default router;