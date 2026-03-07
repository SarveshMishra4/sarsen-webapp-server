/**
 * Contact Controller
 */

import { Request, Response } from "express";
import { submitContact } from "./contact.service.js";
import { validateContact } from "./contact.validator.js";

export const sendContactMessage = (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    validateContact(name, email, message);

    const contact = submitContact(name, email, message);

    res.status(201).json({
      message: "Message sent successfully",
      contact,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};