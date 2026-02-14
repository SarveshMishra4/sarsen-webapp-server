/**
 * Environment Configuration
 * 
 * This file loads and validates environment variables.
 * It ensures all required configuration is present before the app starts.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration object
 * All values are validated and typed
 */
export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || '',
  
  // JWT Secrets
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  
  // JWT Expiry - Will be used in Phase 2
  // TODO: Phase 0 Decision - These values will be confirmed when we reach Phase 2
  JWT_ADMIN_ACCESS_EXPIRY: process.env.JWT_ADMIN_ACCESS_EXPIRY || '15m',
  JWT_CLIENT_ACCESS_EXPIRY: process.env.JWT_CLIENT_ACCESS_EXPIRY || '7d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Razorpay - Will be used in Phase 5
  // TODO: Phase 5 Decision - These values will be provided during payment integration
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  
  // Email - Will be used when sending credentials
  // TODO: Phase 0 Decision - Email configuration will be set when we implement email sending
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@sarsenstrategy.com',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;

/**
 * Validate required environment variables
 * Throws error if any required variable is missing
 */
export const validateEnv = (): void => {
  const requiredVars = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];
  
  const missingVars = requiredVars.filter(varName => !env[varName as keyof typeof env]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file'
    );
  }
  
  console.log('✅ Environment variables validated successfully');
};