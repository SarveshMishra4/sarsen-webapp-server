/**
 * Admin Model
 * 
 * Stores admin user accounts with secure password hashing.
 * Admins have global access to all engagements and system settings.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, RoleType } from '../constants/roles';

export interface IAdmin extends Document {
  email: string;
  password: string;
  role: RoleType;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Method to return admin without sensitive data
  toJSON(): any;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default in queries
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ADMIN,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Remove sensitive data when converting to JSON
AdminSchema.methods.toJSON = function() {
  const admin = this.toObject();
  delete admin.password;
  delete admin.__v;
  return admin;
};

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);