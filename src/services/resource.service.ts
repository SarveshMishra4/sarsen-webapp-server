/**
 * Resource Service
 * 
 * Contains business logic for managing shared resources:
 * - Sharing resources with engagements
 * - Fetching resources for an engagement
 * - Tracking downloads and views
 * - Updating engagement resource counts
 */

import { Resource, IResource, ResourceType } from '../models/Resource.model';
import { Engagement } from '../models/Engagement.model';
import { Admin } from '../models/Admin.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface ShareResourceInput {
  engagementId: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  icon?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

export interface ResourceFilters {
  type?: ResourceType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Share a new resource with an engagement
 * @param input - Resource input data
 * @param adminId - Admin sharing the resource
 * @returns Created resource
 */
export const shareResource = async (
  input: ShareResourceInput,
  adminId: string
): Promise<IResource> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { engagementId, type, title, description, url, fileKey, fileName, fileSize, mimeType, icon, thumbnailUrl, isPublic } = input;
    
    // Verify engagement exists
    const engagement = await Engagement.findById(engagementId).session(session);
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    // Get admin name for snapshot
    const admin = await Admin.findById(adminId).session(session);
    const sharedByName = admin?.email || 'Unknown Admin';
    
    // Create resource
    const [resource] = await Resource.create([{
      engagementId,
      sharedBy: adminId,
      sharedByName,
      type,
      title,
      description,
      url,
      fileKey,
      fileName,
      fileSize,
      mimeType,
      icon,
      thumbnailUrl,
      isPublic: isPublic || false,
      downloadCount: 0,
      viewCount: 0,
      isActive: true,
    }], { session });
    
    await session.commitTransaction();
    
    logger.info(`Resource shared: ${resource._id} with engagement ${engagementId}`);
    
    return resource;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get resources for an engagement
 * @param engagementId - Engagement ID
 * @param filters - Optional filters
 * @returns Array of resources with pagination
 */
export const getEngagementResources = async (
  engagementId: string,
  filters: ResourceFilters = {}
): Promise<{ resources: IResource[]; total: number }> => {
  try {
    const { type, isActive = true, page = 1, limit = 50 } = filters;
    
    const query: any = { engagementId };
    
    if (type) {
      query.type = type;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    
    const skip = (page - 1) * limit;
    
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sharedBy', 'email'),
      Resource.countDocuments(query),
    ]);
    
    return { resources, total };
  } catch (error) {
    logger.error('Error fetching resources:', error);
    throw new ApiError(500, 'Failed to fetch resources');
  }
};

/**
 * Get resource by ID
 * @param resourceId - Resource ID
 * @returns Resource with populated fields
 */
export const getResourceById = async (
  resourceId: string
): Promise<IResource | null> => {
  try {
    return await Resource.findById(resourceId)
      .populate('sharedBy', 'email')
      .populate('engagementId', 'engagementId serviceName');
  } catch (error) {
    logger.error('Error fetching resource:', error);
    throw new ApiError(500, 'Failed to fetch resource');
  }
};

/**
 * Track resource access (download/view)
 * @param resourceId - Resource ID
 * @param action - 'download' or 'view'
 */
export const trackResourceAccess = async (
  resourceId: string,
  action: 'download' | 'view'
): Promise<void> => {
  try {
    const update: any = { lastAccessedAt: new Date() };
    
    if (action === 'download') {
      update.$inc = { downloadCount: 1 };
    } else if (action === 'view') {
      update.$inc = { viewCount: 1 };
    }
    
    await Resource.findByIdAndUpdate(resourceId, update);
  } catch (error) {
    logger.error(`Error tracking resource ${action}:`, error);
    // Don't throw - this is a non-critical operation
  }
};

/**
 * Update resource
 * @param resourceId - Resource ID
 * @param updates - Fields to update
 * @param adminId - Admin performing update
 * @returns Updated resource
 */
export const updateResource = async (
  resourceId: string,
  updates: Partial<ShareResourceInput>,
  adminId: string
): Promise<IResource> => {
  try {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Update fields
    Object.assign(resource, updates);
    
    await resource.save();
    
    logger.info(`Resource ${resourceId} updated by admin ${adminId}`);
    
    return resource;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error updating resource:', error);
    throw new ApiError(500, 'Failed to update resource');
  }
};

/**
 * Delete (deactivate) a resource
 * @param resourceId - Resource ID
 * @param adminId - Admin deleting
 */
export const deleteResource = async (
  resourceId: string,
  adminId: string
): Promise<void> => {
  try {
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Soft delete by deactivating
    resource.isActive = false;
    await resource.save();
    
    logger.info(`Resource ${resourceId} deactivated by admin ${adminId}`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error deleting resource:', error);
    throw new ApiError(500, 'Failed to delete resource');
  }
};

/**
 * Get resource statistics for an engagement
 * @param engagementId - Engagement ID
 * @returns Resource statistics
 */
export const getResourceStats = async (
  engagementId: string
): Promise<{ byType: Record<string, number>; total: number }> => {
  try {
    const stats = await Resource.aggregate([
      { $match: { engagementId: new mongoose.Types.ObjectId(engagementId), isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    
    const byType: Record<string, number> = {};
    let total = 0;
    
    stats.forEach(stat => {
      byType[stat._id] = stat.count;
      total += stat.count;
    });
    
    return { byType, total };
  } catch (error) {
    logger.error('Error getting resource stats:', error);
    throw new ApiError(500, 'Failed to get resource statistics');
  }
};