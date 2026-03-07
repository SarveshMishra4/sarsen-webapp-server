/**
 * Identity Types
 *
 * This file defines all the types used in the identity module.
 * Keeping types here prevents circular dependencies.
 */

export type Role = "admin" | "user";

/**
 * Identity object stored in database
 */
export interface Identity {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

/**
 * JWT payload
 */
export interface TokenPayload {
  id: string;
  role: Role;
}