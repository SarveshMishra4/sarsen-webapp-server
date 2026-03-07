/**
 * Identity Model
 *
 * This file simulates a database.
 * Later you can replace this with a real database model.
 */

import { Identity } from "./identity.types.js";
import { randomUUID } from "crypto";

/**
 * In-memory identity storage
 */
const identities: Identity[] = [];

/**
 * Create a new identity
 */
export const createIdentity = (email: string, passwordHash: string, role: "admin" | "user"): Identity => {
  const newIdentity: Identity = {
    id: randomUUID(),
    email,
    passwordHash,
    role,
    createdAt: new Date(),
  };

  identities.push(newIdentity);
  return newIdentity;
};

/**
 * Find identity by email
 */
export const findIdentityByEmail = (email: string): Identity | undefined => {
  return identities.find((i) => i.email === email);
};

/**
 * Find identity by id
 */
export const findIdentityById = (id: string): Identity | undefined => {
  return identities.find((i) => i.id === id);
};

/**
 * Check if admin already exists
 */
export const adminExists = (): boolean => {
  return identities.some((i) => i.role === "admin");
};