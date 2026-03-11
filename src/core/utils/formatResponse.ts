/**
 * formatResponse.ts
 *
 * Standardizes every API response across the entire backend.
 *
 * PURPOSE:
 * Every response — success or failure — uses the same shape.
 * This makes the frontend predictable and debugging much faster
 * because you always know exactly what to expect.
 *
 * RESPONSE SHAPE:
 *   { success: true,  message: "Engagement retrieved", data: { ... } }
 *   { success: false, message: "Service not found" }
 *
 * USAGE:
 *   import { formatResponse } from '../core/utils/formatResponse';
 *
 *   // Success with data
 *   res.status(200).json(formatResponse(true, 'Login successful', { token, user }));
 *
 *   // Success without data (e.g. status update)
 *   res.status(200).json(formatResponse(true, 'Status updated'));
 *
 *   // Failure (typically done via errorHandler, but usable directly)
 *   res.status(404).json(formatResponse(false, 'Engagement not found'));
 *
 * RULES:
 * - Always use this — never send raw objects or ad-hoc response shapes.
 * - The data field is omitted entirely when not provided (not null, not undefined).
 * - Never put sensitive fields (passwords, secrets) inside data.
 */

export const formatResponse = (
  success: boolean,
  message: string,
  data?: any
): { success: boolean; message: string; data?: any } => {
  return {
    success,
    message,
    ...(data !== undefined && { data }),
  };
};