/**
 * Resource Controller
 * 
 * Handles HTTP requests for resource management:
 * - Sharing resources
 * - Fetching resources
 * - Tracking downloads/views
 * - Managing resource lifecycle
 */

import { Request, Response, NextFunction } from 'express';
import * as resourceService from '../services/resource.service';
import { validateShareResource, validateResourceId, validateResourceFilters } from '../validators/resource.validator';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';
import { ResourceType } from '../models/Resource.model'; // Import for type casting

/**
 * Share a new resource
 * POST /api/admin/resources
 * Access: Admin only
 */
export const shareResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const resourceData = validateShareResource(req.body);
    
    const resource = await resourceService.shareResource(resourceData, req.admin.id);
    
    res.status(201).json({
      success: true,
      message: 'Resource shared successfully',
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get resources for an engagement (admin)
 * GET /api/admin/engagements/:engagementId/resources
 * Access: Admin only
 */
export const getEngagementResources = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { engagementId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new ApiError(400, 'Invalid engagement ID format');
    }
    
    const filters = validateResourceFilters(req.query);
    
    // FIXED: Cast the filters to match service expectations
    // The validator ensures type is a valid ResourceType string, so casting is safe
    const serviceFilters: resourceService.ResourceFilters = {
      page: filters.page,
      limit: filters.limit,
      isActive: filters.isActive,
      type: filters.type as ResourceType | undefined, // Explicit cast to ResourceType
    };
    
    const result = await resourceService.getEngagementResources(engagementId, serviceFilters);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get resources for client's engagement
 * GET /api/client/resources
 * Access: Client only
 */
export const getMyResources = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    if (!req.client.engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const filters = validateResourceFilters(req.query);
    
    // FIXED: Same casting for client endpoint
    const serviceFilters: resourceService.ResourceFilters = {
      page: filters.page,
      limit: filters.limit,
      isActive: filters.isActive,
      type: filters.type as ResourceType | undefined,
    };
    
    const result = await resourceService.getEngagementResources(req.client.engagementId, serviceFilters);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get resource by ID
 * GET /api/resources/:resourceId
 * Access: Client or Admin (with access check)
 */
export const getResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { resourceId } = req.params;
    validateResourceId(resourceId);
    
    const resource = await resourceService.getResourceById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check access
    if (req.client) {
      if (resource.engagementId.toString() !== req.client.engagementId) {
        throw new ApiError(403, 'You do not have access to this resource');
      }
    } else if (!req.admin) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Track view
    await resourceService.trackResourceAccess(resourceId, 'view');
    
    res.status(200).json({
      success: true,
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download resource (tracks download count)
 * GET /api/resources/:resourceId/download
 * Access: Client or Admin (with access check)
 */
export const downloadResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { resourceId } = req.params;
    validateResourceId(resourceId);
    
    const resource = await resourceService.getResourceById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    // Check access
    if (req.client) {
      if (resource.engagementId.toString() !== req.client.engagementId) {
        throw new ApiError(403, 'You do not have access to this resource');
      }
    } else if (!req.admin) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Track download
    await resourceService.trackResourceAccess(resourceId, 'download');
    
    // Return resource info - frontend will handle actual download
    res.status(200).json({
      success: true,
      data: {
        url: resource.url,
        fileKey: resource.fileKey,
        fileName: resource.fileName,
        mimeType: resource.mimeType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update resource
 * PATCH /api/admin/resources/:resourceId
 * Access: Admin only
 */
export const updateResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { resourceId } = req.params;
    validateResourceId(resourceId);
    
    const updates = validateShareResource(req.body);
    
    const resource = await resourceService.updateResource(resourceId, updates, req.admin.id);
    
    res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (deactivate) resource
 * DELETE /api/admin/resources/:resourceId
 * Access: Admin only
 */
export const deleteResource = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { resourceId } = req.params;
    validateResourceId(resourceId);
    
    await resourceService.deleteResource(resourceId, req.admin.id);
    
    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get resource statistics
 * GET /api/admin/engagements/:engagementId/resources/stats
 * Access: Admin only
 */
export const getResourceStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { engagementId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new ApiError(400, 'Invalid engagement ID format');
    }
    
    const stats = await resourceService.getResourceStats(engagementId);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};