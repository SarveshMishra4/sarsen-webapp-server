/**
 * Identity Controller
 *
 * Handles HTTP requests and calls the service layer.
 */

import { Request, Response } from "express";
import { createAdmin, loginAdmin } from "./identity.service.js";

/**
 * Setup first admin
 *
 * Endpoint: POST /identity/admin/setup
 */
export const setupAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const admin = await createAdmin(email, password);

    res.status(201).json({
      message: "Admin created successfully",
      admin,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};

/**
 * Admin login
 *
 * Endpoint: POST /identity/admin/login
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const token = await loginAdmin(email, password);

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error: any) {
    res.status(401).json({
      error: error.message,
    });
  }
};