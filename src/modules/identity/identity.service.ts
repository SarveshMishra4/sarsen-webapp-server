/**
 * Identity Service
 *
 * Contains all business logic related to authentication.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  createIdentity,
  findIdentityByEmail,
  adminExists,
} from "./identity.model.js";
import { TokenPayload } from "./identity.types.js";

/**
 * Secret key for JWT
 * In production move this to environment variables
 */
const JWT_SECRET = "SUPER_SECRET_KEY";

/**
 * Create first admin
 */
export const createAdmin = async (email: string, password: string) => {
  const adminAlreadyExists = await adminExists();

  if (adminAlreadyExists) {
    throw new Error("Admin already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await createIdentity(email, passwordHash, "admin");

  return admin;
};

/**
 * Admin login
 */
export const loginAdmin = async (email: string, password: string) => {
  const identity = await findIdentityByEmail(email);

  if (!identity || identity.role !== "admin") {
    throw new Error("Invalid credentials");
  }

  const passwordMatch = await bcrypt.compare(password, identity.passwordHash);

  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  const payload: TokenPayload = {
    id: identity._id.toString(),
    role: identity.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "24h",
  });

  return token;
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};