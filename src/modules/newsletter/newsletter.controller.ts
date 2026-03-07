/**
 * Newsletter Controller
 */

import { Request, Response } from "express";
import { subscribe } from "./newsletter.service.js";
import { validateEmail } from "./newsletter.validator.js";

export const subscribeNewsletter = (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    validateEmail(email);

    const subscriber = subscribe(email);

    res.status(201).json({
      message: "Subscribed successfully",
      subscriber,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};