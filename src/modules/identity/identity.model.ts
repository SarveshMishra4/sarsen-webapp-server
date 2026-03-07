/**
 * Identity Model
 *
 * MongoDB model for storing user identities.
 */

import mongoose from "mongoose";

/**
 * Identity schema
 */
const identitySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  passwordHash: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * MongoDB model
 */
const IdentityModel = mongoose.model("Identity", identitySchema);

/**
 * Create a new identity
 */
export const createIdentity = async (
  email: string,
  passwordHash: string,
  role: "admin" | "user"
) => {
  const identity = await IdentityModel.create({
    email,
    passwordHash,
    role,
  });

  return identity;
};

/**
 * Find identity by email
 */
export const findIdentityByEmail = async (email: string) => {
  return await IdentityModel.findOne({ email });
};

/**
 * Find identity by ID
 */
export const findIdentityById = async (id: string) => {
  return await IdentityModel.findById(id);
};

/**
 * Check if admin exists
 */
export const adminExists = async () => {
  const admin = await IdentityModel.findOne({ role: "admin" });

  return !!admin;
};