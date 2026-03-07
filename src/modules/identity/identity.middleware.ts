/**
 * Identity Middleware
 *
 * Protects routes by verifying JWT tokens.
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./identity.service.js";

/**
 * Extend express request
 */
declare global {
  namespace Express {
    interface Request {
      identity?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Require authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];

    const identity = verifyToken(token);

    req.identity = identity;

    next();
  } catch (error) {
    res.status(401).json({
      error: "Invalid or expired token",
    });
  }
};

/**
 * Require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.identity?.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required",
    });
  }

  next();
};