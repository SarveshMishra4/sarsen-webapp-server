/**
 * FILE: core/config/env.ts
 *
 * PURPOSE
 * Loads and validates environment variables used across the backend.
 *
 * IMPORTED IN
 * - server.ts (to start the server with correct configuration)
 * - core/database/database.ts (for database connection string)
 * - authentication modules (JWT secret)
 *
 * DEPENDENCIES
 * dotenv
 */

import dotenv from "dotenv";

console.log("Loading environment variables...");

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || "5000",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "default_secret",
  NODE_ENV: process.env.NODE_ENV || "development"
};

if (!ENV.DATABASE_URL) {
  console.error("DATABASE_URL is missing in environment variables");
  process.exit(1);
}

console.log("Environment variables loaded successfully");