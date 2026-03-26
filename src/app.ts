/**
 * app.ts
 *
 * Express application setup.
 *
 * PURPOSE:
 * Configures and assembles the Express app — middleware, routes, and
 * error handling — in the correct order. Does NOT start the server.
 * Server startup lives in server.ts so this file stays testable.
 *
 * MIDDLEWARE ORDER (order matters in Express):
 * 1. Security headers (helmet)
 * 2. CORS
 * 3. Request logger (must be before routes to log all requests)
 * 4. express.raw() for webhook route (MUST be before express.json())
 * 5. express.json() for all other routes
 * 6. Routes
 * 7. 404 handler (after all routes)
 * 8. Global error handler (always last)
 *
 * HOW TO DEBUG:
 * - If webhook signature verification always fails, check that /payments/webhook
 * is registered BEFORE app.use(express.json()). express.json() consumes the
 * raw body and Razorpay's HMAC check will always fail after that.
 * - If CORS errors appear in browser console, update ALLOWED_ORIGINS below.
 * - If a route returns 404 but you added it, check that you imported and
 * registered it in the ROUTES section below.
 * - 404 responses from the catch-all mean the URL doesn't match any registered
 * route — check the path and HTTP method carefully.
 */

import './core/config/env.js'; // MUST be first — validates environment before anything runs

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { requestLogger } from './core/middleware/requestLogger.js';
import { errorHandler } from './core/middleware/errorHandler.js';
import { formatResponse } from './core/utils/formatResponse.js';
import { logger } from './core/logger/logger.js';

// ─── Route Imports ────────────────────────────────────────────────────────────

import adminRoutes from './modules/admin/admin.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';

// Add future module routes here as they are built:
import newsletterRoutes from './modules/newsletter/newsletter.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';
import serviceRoutes from './modules/services/services.routes.js';
import couponRoutes from './modules/coupons/coupon.routes.js';
import authRoutes from './modules/identity/identity.routes.js';
import engagementRoutes from './modules/engagements/engagement.routes.js';
import { questionnaireRouter } from './modules/questionnaires/questionnaire.routes.js';
import feedbackRoutes from './modules/feedbacks/feedback.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

// ─── CORS Configuration ───────────────────────────────────────────────────────

const ALLOWED_ORIGINS: string[] = [
  'http://localhost:3000',   // Local frontend dev
  'http://localhost:5173',   // Vite dev server
  // Add your production frontend domain here:
  'https://sarsen-webapp-client.vercel.app',
  'https://sarsenpartners.com',
  'http://sarsenpartners.com',
  'https://www.sarsenpartners.com',
  'http://www.sarsenpartners.com',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`CORS policy: origin ${origin} is not allowed`));
    }
  },
  credentials: true, // Allow cookies and Authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ─── App Init ─────────────────────────────────────────────────────────────────

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ─── Request Logger ───────────────────────────────────────────────────────────
// Before all routes so every request is captured
app.use(requestLogger);

// ─── CRITICAL: Webhook route uses raw body ────────────────────────────────────
// Must be registered BEFORE express.json() below.
// express.json() would consume the raw body and break Razorpay signature verification.
// app.use(
//   '/payments/webhook',
//   express.raw({ type: 'application/json' })
// );

// ─── Body Parsers ─────────────────────────────────────────────────────────────
// All other routes get parsed JSON bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
// Used by deployment platforms and monitoring tools to verify the server is alive
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json(
    formatResponse(true, 'Server is running', {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    })
  );
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/admin', adminRoutes);
app.use('/payments', paymentRoutes);

// Uncomment as each module is built:
app.use('/newsletter', newsletterRoutes);
app.use('/contact', contactRoutes);
app.use('/services', serviceRoutes);
app.use('/coupons', couponRoutes);
app.use('/auth', authRoutes);
app.use('/engagements', engagementRoutes);
app.use('/questionnaires', questionnaireRouter);
app.use('/feedback', feedbackRoutes);
app.use('/notifications', notificationRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Catches any request that didn't match a registered route
app.use((req: Request, res: Response) => {
  logger.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json(
    formatResponse(false, `Route not found: ${req.method} ${req.originalUrl}`)
  );
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// Must be LAST — Express identifies error handlers by their 4-argument signature
app.use(errorHandler);

export default app;