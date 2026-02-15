/**
 * Global Type Definitions
 * 
 * This file extends Express Request type to include user information
 * after authentication middleware runs.
 */

import 'express';

declare global {
  namespace Express {
    export interface Request {
      /**
       * Admin user information attached by adminAuth middleware
       */
      admin?: {
        id: string;
        email: string;
        role: string;
      };
      
      /**
       * Client user information attached by clientAuth middleware
       */
      client?: {
        id: string;
        engagementId: string;
        email: string;
      };
      
      /**
       * Engagement information for client-scoped requests
       */
      engagement?: {
        id: string;
        userId: string;
        progress: number;
        messagingAllowed: boolean;
      };
    }
  }
}

// Type exports for JWT payloads used in token.service.ts
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface AdminTokenPayload extends TokenPayload {
  role: 'ADMIN';
}

export interface ClientTokenPayload extends TokenPayload {
  role: 'CLIENT';
  engagementId?: string;
}

// PHASE 3: Blueprint-related type definitions
export interface BlueprintResource {
  type: 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image';
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  order: number;
  isRequired: boolean;
}

export interface BlueprintSection {
  title: string;
  description?: string;
  type: 'milestones' | 'resources' | 'questionnaires' | 'instructions' | 'custom';
  order: number;
  content?: any;
}

export interface BlueprintMilestone {
  value: number; // Should be from MILESTONES constants
  label: string;
  description?: string;
  order: number;
  isAutomatic: boolean;
}

export interface ServiceBlueprintData {
  serviceCode: string;
  serviceName: string;
  serviceSlug: string;
  milestones: BlueprintMilestone[];
  sections: BlueprintSection[];
  resources: BlueprintResource[];
  defaultProgress: number;
  messagingEnabledByDefault: boolean;
  version: number;
  isActive: boolean;
}