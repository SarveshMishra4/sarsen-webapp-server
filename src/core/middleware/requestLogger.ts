/**
 * FILE: core/middleware/requestLogger.ts
 *
 * PURPOSE
 * Logs every incoming HTTP request.
 *
 * IMPORTED IN
 * - server.ts
 *
 * DEPENDENCIES
 * express
 */

import { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(
    `[REQUEST] ${req.method} ${req.url} - ${new Date().toISOString()}`
  );

  next();
};