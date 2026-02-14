/**
 * Health Check Route
 * 
 * Simple endpoint to verify the API is running.
 * Used for monitoring and deployment verification.
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Sarsen Strategy Partners API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;