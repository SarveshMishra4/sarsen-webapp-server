/**
 * FILE: core/database/database.ts
 *
 * PURPOSE
 * Creates and manages the database connection.
 *
 * IMPORTED IN
 * - server.ts (to initialize DB before starting server)
 * - All repository/model files indirectly use this connection
 *
 * DEPENDENCIES
 * mongoose
 */

import mongoose from "mongoose";
import { ENV } from "../config/env.js";

export const connectDatabase = async () => {
  try {
    console.log("Attempting database connection...");

    await mongoose.connect(ENV.DATABASE_URL);

    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed");
    console.error(error);

    process.exit(1);
  }
};