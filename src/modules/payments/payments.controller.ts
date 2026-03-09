/**
 * FILE: modules/payments/payments.controller.ts
 */

import { Request, Response } from "express";
import {
  createPaymentOrder,
  verifyPayment,
} from "./payments.service.js";

/**
 * Create payment order
 */
export const createOrderController = async (
  req: Request,
  res: Response
) => {
  try {

    const { serviceId } = req.body;

    const order = await createPaymentOrder(serviceId);

    res.json({
      success: true,
      data: order,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Order creation failed",
    });

  }
};

/**
 * Verify payment
 */
export const verifyPaymentController = async (
  req: Request,
  res: Response
) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const payment = await verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.json({
      success: true,
      data: payment,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: "Payment verification failed",
    });

  }
};