/**
 * FILE: core/middleware/errorHandler.ts
 *
 * PURPOSE
 * Global error handling middleware.
 *
 * IMPORTED IN
 * - server.ts (last middleware)
 *
 * DEPENDENCIES
 * express
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error handler triggered");

  const statusCode = err instanceof AppError ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
};