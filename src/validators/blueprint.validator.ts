/**
 * Service Blueprint Validators
 * 
 * Validates incoming request data for blueprint endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import { isValidMilestone } from '../constants/milestones';

export interface CreateBlueprintRequest {
  serviceCode: string;
  serviceName: string;
  serviceSlug: string;
  milestones?: any[];
  sections?: any[];
  resources?: any[];
  defaultProgress?: number;
  messagingEnabledByDefault?: boolean;
}

export interface UpdateBlueprintRequest {
  serviceName?: string;
  milestones?: any[];
  sections?: any[];
  resources?: any[];
  defaultProgress?: number;
  messagingEnabledByDefault?: boolean;
  isActive?: boolean;
}

/**
 * Validate create blueprint request
 * @param body - Request body
 * @returns Validated blueprint data
 */
export const validateCreateBlueprint = (body: any): CreateBlueprintRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate serviceCode
  if (!body.serviceCode) {
    errors.push('Service code is required');
  } else if (typeof body.serviceCode !== 'string') {
    errors.push('Service code must be a string');
  } else if (body.serviceCode.length < 3 || body.serviceCode.length > 20) {
    errors.push('Service code must be between 3 and 20 characters');
  } else if (!/^[A-Z0-9_]+$/.test(body.serviceCode)) {
    errors.push('Service code can only contain uppercase letters, numbers, and underscores');
  }

  // Validate serviceName
  if (!body.serviceName) {
    errors.push('Service name is required');
  } else if (typeof body.serviceName !== 'string') {
    errors.push('Service name must be a string');
  } else if (body.serviceName.length < 3 || body.serviceName.length > 100) {
    errors.push('Service name must be between 3 and 100 characters');
  }

  // Validate serviceSlug
  if (!body.serviceSlug) {
    errors.push('Service slug is required');
  } else if (typeof body.serviceSlug !== 'string') {
    errors.push('Service slug must be a string');
  } else if (!/^[a-z0-9-]+$/.test(body.serviceSlug)) {
    errors.push('Service slug can only contain lowercase letters, numbers, and hyphens');
  }

  // Validate milestones if provided
  if (body.milestones !== undefined) {
    if (!Array.isArray(body.milestones)) {
      errors.push('Milestones must be an array');
    } else {
      body.milestones.forEach((milestone: any, index: number) => {
        if (!milestone.value) {
          errors.push(`Milestone at index ${index} is missing value`);
        } else if (typeof milestone.value !== 'number') {
          errors.push(`Milestone at index ${index} value must be a number`);
        } else if (!isValidMilestone(milestone.value)) {
          errors.push(`Milestone at index ${index} has invalid value: ${milestone.value}`);
        }
        
        if (!milestone.label) {
          errors.push(`Milestone at index ${index} is missing label`);
        } else if (typeof milestone.label !== 'string') {
          errors.push(`Milestone at index ${index} label must be a string`);
        }
      });
    }
  }

  // Validate defaultProgress if provided
  if (body.defaultProgress !== undefined) {
    if (typeof body.defaultProgress !== 'number') {
      errors.push('Default progress must be a number');
    } else if (!isValidMilestone(body.defaultProgress)) {
      errors.push(`Default progress must be a valid milestone: ${body.defaultProgress}`);
    }
  }

  // If any errors, throw
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    serviceCode: body.serviceCode.toUpperCase().trim(),
    serviceName: body.serviceName.trim(),
    serviceSlug: body.serviceSlug.toLowerCase().trim(),
    milestones: body.milestones,
    sections: body.sections,
    resources: body.resources,
    defaultProgress: body.defaultProgress,
    messagingEnabledByDefault: body.messagingEnabledByDefault,
  };
};

/**
 * Validate update blueprint request
 * @param body - Request body
 * @returns Validated update data
 */
export const validateUpdateBlueprint = (body: any): UpdateBlueprintRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate serviceName if provided
  if (body.serviceName !== undefined) {
    if (typeof body.serviceName !== 'string') {
      errors.push('Service name must be a string');
    } else if (body.serviceName.length < 3 || body.serviceName.length > 100) {
      errors.push('Service name must be between 3 and 100 characters');
    }
  }

  // Validate milestones if provided
  if (body.milestones !== undefined) {
    if (!Array.isArray(body.milestones)) {
      errors.push('Milestones must be an array');
    } else {
      body.milestones.forEach((milestone: any, index: number) => {
        if (!milestone.value) {
          errors.push(`Milestone at index ${index} is missing value`);
        } else if (typeof milestone.value !== 'number') {
          errors.push(`Milestone at index ${index} value must be a number`);
        } else if (!isValidMilestone(milestone.value)) {
          errors.push(`Milestone at index ${index} has invalid value: ${milestone.value}`);
        }
        
        if (!milestone.label) {
          errors.push(`Milestone at index ${index} is missing label`);
        } else if (typeof milestone.label !== 'string') {
          errors.push(`Milestone at index ${index} label must be a string`);
        }
      });
    }
  }

  // Validate defaultProgress if provided
  if (body.defaultProgress !== undefined) {
    if (typeof body.defaultProgress !== 'number') {
      errors.push('Default progress must be a number');
    } else if (!isValidMilestone(body.defaultProgress)) {
      errors.push(`Default progress must be a valid milestone: ${body.defaultProgress}`);
    }
  }

  // Validate isActive if provided
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  // If any errors, throw
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    serviceName: body.serviceName?.trim(),
    milestones: body.milestones,
    sections: body.sections,
    resources: body.resources,
    defaultProgress: body.defaultProgress,
    messagingEnabledByDefault: body.messagingEnabledByDefault,
    isActive: body.isActive,
  };
};