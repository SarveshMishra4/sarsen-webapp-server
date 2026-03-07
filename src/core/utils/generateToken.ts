/**
 * FILE: core/utils/generateToken.ts
 *
 * PURPOSE
 * Generates authentication tokens.
 *
 * IMPORTED IN
 * - authentication service
 * - login controller
 *
 * DEPENDENCIES
 * jsonwebtoken
 */

import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export const generateToken = (userId: string) => {
  console.log("Generating JWT token for user:", userId);

  return jwt.sign(
    { id: userId },
    ENV.JWT_SECRET,
    { expiresIn: "7d" }
  );
};