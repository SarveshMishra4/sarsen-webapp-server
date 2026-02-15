/**
 * Application Loaders
 * 
 * Centralizes all initialization logic:
 * - Environment validation
 * - Database connection
 * - Express middleware
 * - Route registration
 */

import express, { Application } from 'express';
import cors from 'cors';
import { env, validateEnv } from '../config/env';
import { connectDB } from '../config/db';
import { errorHandler } from '../middleware/error.middleware';
import { requestLogger } from '../middleware/requestLogger.middleware';

// Import routes
import healthRoutes from '../routes/health.route';
// Phase 2: Admin auth routes
import adminAuthRoutes from '../routes/adminAuth.routes';
// Phase 3: Blueprint routes for service template management
import blueprintRoutes from '../routes/blueprint.routes';
// Phase 4: Client auth routes for engagement-scoped user access
import clientAuthRoutes from '../routes/clientAuth.routes';
// Phase 5: Engagement routes for core engagement management
import engagementRoutes from '../routes/engagement.routes';
// Phase 5: Payment routes for Razorpay integration
import paymentRoutes from '../routes/payment.routes';
// Phase 6: Message routes for engagement-scoped messaging
import messageRoutes from '../routes/message.routes';
// Phase 7: Questionnaire routes for client surveys and data collection
import questionnaireRoutes from '../routes/questionnaire.routes';
// Phase 7: Resource routes for file and link sharing
import resourceRoutes from '../routes/resource.routes';
// Phase 8: Progress routes for milestone tracking and analytics
import progressRoutes from '../routes/progress.routes';
// Phase 9: Feedback routes for mandatory post-completion feedback
import feedbackRoutes from '../routes/feedback.routes';
// PHASE 10: Dashboard routes for admin overview and notifications
import dashboardRoutes from '../routes/dashboard.routes';

/**
 * Initialize all application components
 */
export const initLoaders = async (app: Application): Promise<void> => {
  try {
    console.log('🚀 Initializing application...');
    
    // 1. Validate environment variables
    validateEnv();
    
    // 2. Connect to database
    await connectDB();
    
    // 3. Setup basic middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // 4. Setup CORS
    // TODO: Phase 0 Decision - Frontend URL will be confirmed during integration
    app.use(cors({
      origin: env.CLIENT_URL.split(','),
      credentials: true, // Allow cookies for token storage
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    
    // 5. Request logging
    app.use(requestLogger);
    
    // 6. Register routes
    console.log('📝 Registering routes...');
    
    // Public routes
    app.use('/health', healthRoutes);
    
    // Phase 2: Admin authentication routes
    app.use('/api/admin/auth', adminAuthRoutes);
    
    // Phase 3: Service blueprint management routes (admin only)
    app.use('/api/admin/blueprints', blueprintRoutes);
    
    // Phase 4: Client authentication routes (engagement-scoped)
    app.use('/api/client/auth', clientAuthRoutes);
    
    // Phase 5: Engagement routes (client and admin)
    app.use('/api', engagementRoutes); // Contains /api/client/engagements and /api/admin/engagements
    
    // Phase 5: Payment routes (public and admin)
    app.use('/api', paymentRoutes); // Contains /api/payments/* and /api/admin/payments/*
    
    // Phase 6: Message routes (client and admin messaging)
    app.use('/api', messageRoutes); // Contains /api/messages/* and /api/admin/messages/*
    
    // Phase 7: Questionnaire routes (admin and client)
    app.use('/api', questionnaireRoutes); // Contains /api/admin/questionnaires/* and /api/client/questionnaires/*
    
    // Phase 7: Resource routes (admin and client)
    app.use('/api', resourceRoutes); // Contains /api/admin/resources/*, /api/client/resources/*, and /api/resources/*
    
    // Phase 8: Progress routes (admin and client)
    app.use('/api', progressRoutes); // Contains /api/admin/progress/* and /api/client/engagements/*/progress
    
    // Phase 9: Feedback routes (admin and client)
    app.use('/api', feedbackRoutes); // Contains /api/client/feedback/* and /api/admin/feedback/*
    
    // PHASE 10: Dashboard routes (admin only)
    app.use('/api/admin', dashboardRoutes); // Contains /api/admin/dashboard/* and /api/admin/notifications/*
    
    // 7. Health check at root (optional)
    app.get('/', (req, res) => {
      res.redirect('/health');
    });
    
    // 8. 404 handler for undefined routes
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`,
      });
    });
    
    // 9. Global error handler (must be last)
    app.use(errorHandler);
    
    console.log('✅ Application initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    throw error;
  }
};