/**
 * Global Error Handling Middleware
 * 
 * This middleware catches all errors thrown in the application
 * and formats them into consistent API responses.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let error = err;
  
  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = (error as any).statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false);
  }
  
  const apiError = error as ApiError;
  
  // Log error
  console.error(`❌ Error [${apiError.statusCode}]: ${apiError.message}`);
  if (env.NODE_ENV === 'development' && !apiError.isOperational) {
    console.error(error.stack);
  }
  
  // Send response
  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};