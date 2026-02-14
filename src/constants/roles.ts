/**
 * User Roles Constants
 * 
 * Defines all possible user roles in the system.
 * Used throughout the application for role-based access control.
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
} as const;

// Type for TypeScript - can be used as: role: RoleType
export type RoleType = typeof ROLES[keyof typeof ROLES];