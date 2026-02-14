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
// NEW: Import admin auth routes for Phase 2
import adminAuthRoutes from '../routes/adminAuth.routes';

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
    app.use('/health', healthRoutes);
    // NEW: Register admin auth routes under /api/admin/auth
    app.use('/api/admin/auth', adminAuthRoutes);
    
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