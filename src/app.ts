/**
 * Express Application Configuration
 * 
 * This file creates and configures the Express application.
 * It does NOT start the server - that's handled by server.ts
 */

import express from 'express';
import { initLoaders } from './loaders';

const app = express();

export const startApp = async () => {
  try {
    await initLoaders(app);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
};

export default app;
