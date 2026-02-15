/**
 * Service Blueprint Service
 * 
 * Contains business logic for managing service blueprints:
 * - Create, read, update, delete blueprints
 * - Clone blueprints for engagement creation
 * - Validate blueprint structure
 */

import { ServiceBlueprint, IServiceBlueprint } from '../models/ServiceBlueprint.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import { isValidMilestone, DEFAULT_STARTING_MILESTONE } from '../constants/milestones';

export interface CreateBlueprintInput {
  serviceCode: string;
  serviceName: string;
  serviceSlug: string;
  milestones?: any[];
  sections?: any[];
  resources?: any[];
  defaultProgress?: number;
  messagingEnabledByDefault?: boolean;
}

export interface UpdateBlueprintInput extends Partial<CreateBlueprintInput> {
  version?: number;
  isActive?: boolean;
}

/**
 * Create a new service blueprint
 * @param input - Blueprint data
 * @param adminId - ID of admin creating the blueprint
 * @returns Created blueprint
 */
export const createBlueprint = async (
  input: CreateBlueprintInput,
  adminId: string
): Promise<IServiceBlueprint> => {
  try {
    // Check if blueprint with same serviceCode or slug already exists
    const existing = await ServiceBlueprint.findOne({
      $or: [
        { serviceCode: input.serviceCode },
        { serviceSlug: input.serviceSlug },
      ],
    });

    if (existing) {
      throw new ApiError(
        409,
        'Blueprint with this service code or slug already exists'
      );
    }

    // Validate milestones if provided
    if (input.milestones && input.milestones.length > 0) {
      for (const milestone of input.milestones) {
        if (!isValidMilestone(milestone.value)) {
          throw new ApiError(
            400,
            `Invalid milestone value: ${milestone.value}. Allowed values: 10,20,25,30,40,50,60,70,75,80,90,100`
          );
        }
      }
    }

    // Create blueprint
    const blueprint = await ServiceBlueprint.create({
      ...input,
      createdBy: adminId,
      defaultProgress: input.defaultProgress || DEFAULT_STARTING_MILESTONE,
    });

    logger.info(`Service blueprint created: ${blueprint.serviceCode}`);
    return blueprint;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error creating service blueprint:', error);
    throw new ApiError(500, 'Failed to create service blueprint');
  }
};

/**
 * Get blueprint by service code
 * @param serviceCode - Unique service code
 * @returns Blueprint or null
 */
export const getBlueprintByCode = async (
  serviceCode: string
): Promise<IServiceBlueprint | null> => {
  try {
    return await ServiceBlueprint.findOne({
      serviceCode: serviceCode.toUpperCase(),
    }).populate('createdBy', 'email');
  } catch (error) {
    logger.error('Error fetching blueprint by code:', error);
    throw new ApiError(500, 'Failed to fetch blueprint');
  }
};

/**
 * Get blueprint by service slug
 * @param slug - Service slug
 * @returns Blueprint or null
 */
export const getBlueprintBySlug = async (
  slug: string
): Promise<IServiceBlueprint | null> => {
  try {
    return await ServiceBlueprint.findOne({
      serviceSlug: slug.toLowerCase(),
      isActive: true,
    }).populate('createdBy', 'email');
  } catch (error) {
    logger.error('Error fetching blueprint by slug:', error);
    throw new ApiError(500, 'Failed to fetch blueprint');
  }
};

/**
 * Get all blueprints (with optional filters)
 * @param filters - Optional filters (isActive, etc.)
 * @returns Array of blueprints
 */
export const getAllBlueprints = async (
  filters: { isActive?: boolean } = {}
): Promise<IServiceBlueprint[]> => {
  try {
    const query: any = {};
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    return await ServiceBlueprint.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'email');
  } catch (error) {
    logger.error('Error fetching blueprints:', error);
    throw new ApiError(500, 'Failed to fetch blueprints');
  }
};

/**
 * Update a service blueprint
 * @param serviceCode - Service code to update
 * @param updates - Updates to apply
 * @param adminId - Admin performing update
 * @returns Updated blueprint
 */
export const updateBlueprint = async (
  serviceCode: string,
  updates: UpdateBlueprintInput,
  adminId: string
): Promise<IServiceBlueprint> => {
  try {
    const blueprint = await ServiceBlueprint.findOne({
      serviceCode: serviceCode.toUpperCase(),
    });

    if (!blueprint) {
      throw new ApiError(404, 'Blueprint not found');
    }

    // Validate milestones if being updated
    if (updates.milestones) {
      for (const milestone of updates.milestones) {
        if (!isValidMilestone(milestone.value)) {
          throw new ApiError(
            400,
            `Invalid milestone value: ${milestone.value}. Allowed values: 10,20,25,30,40,50,60,70,75,80,90,100`
          );
        }
      }
    }

    // Increment version on significant updates
    if (Object.keys(updates).length > 0) {
      updates.version = (blueprint.version || 1) + 1;
    }

    // Apply updates
    Object.assign(blueprint, updates);
    await blueprint.save();

    logger.info(`Service blueprint updated: ${blueprint.serviceCode}`);
    return blueprint;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error updating blueprint:', error);
    throw new ApiError(500, 'Failed to update blueprint');
  }
};

/**
 * Delete a blueprint (soft delete by setting isActive to false)
 * @param serviceCode - Service code to delete
 * @returns Boolean indicating success
 */
export const deleteBlueprint = async (serviceCode: string): Promise<boolean> => {
  try {
    const blueprint = await ServiceBlueprint.findOne({
      serviceCode: serviceCode.toUpperCase(),
    });

    if (!blueprint) {
      throw new ApiError(404, 'Blueprint not found');
    }

    // Soft delete by deactivating
    blueprint.isActive = false;
    await blueprint.save();

    logger.info(`Service blueprint deactivated: ${blueprint.serviceCode}`);
    return true;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error deleting blueprint:', error);
    throw new ApiError(500, 'Failed to delete blueprint');
  }
};

/**
 * Clone blueprint for engagement creation
 * This creates a deep copy of the blueprint structure
 * @param serviceCode - Service code to clone
 * @returns Cloned blueprint data (plain object, not saved to DB)
 */
export const cloneBlueprintForEngagement = async (
  serviceCode: string
): Promise<any> => {
  try {
    const blueprint = await ServiceBlueprint.findOne({
      serviceCode: serviceCode.toUpperCase(),
      isActive: true,
    });

    if (!blueprint) {
      throw new ApiError(404, 'Active blueprint not found for this service');
    }

    // Return a plain object copy (will be used in Phase 5)
    return {
      serviceCode: blueprint.serviceCode,
      serviceName: blueprint.serviceName,
      serviceSlug: blueprint.serviceSlug,
      milestones: JSON.parse(JSON.stringify(blueprint.milestones)),
      sections: JSON.parse(JSON.stringify(blueprint.sections)),
      resources: JSON.parse(JSON.stringify(blueprint.resources)),
      defaultProgress: blueprint.defaultProgress,
      messagingEnabledByDefault: blueprint.messagingEnabledByDefault,
      blueprintVersion: blueprint.version,
      blueprintId: blueprint._id,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error cloning blueprint:', error);
    throw new ApiError(500, 'Failed to clone blueprint');
  }
};