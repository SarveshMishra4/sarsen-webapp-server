/**
 * FILE: core/errors/AppError.ts
 *
 * PURPOSE
 * Defines a standardized error object used across the application.
 *
 * IMPORTED IN
 * - Controllers
 * - Services
 * - Middleware error handler
 *
 * DEPENDENCIES
 * None
 */

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);

    this.statusCode = statusCode;

    console.error(`AppError created: ${message}`);
  }
}