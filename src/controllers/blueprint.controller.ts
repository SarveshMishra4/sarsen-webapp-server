/**
 * Service Blueprint Controller
 * 
 * Handles HTTP requests for service blueprint management.
 * All endpoints are admin-only.
 */

import { Request, Response, NextFunction } from 'express';
import * as blueprintService from '../services/blueprint.service';
import { validateCreateBlueprint, validateUpdateBlueprint } from '../validators/blueprint.validator';
import { logger } from '../utils/logger';

/**
 * Create a new service blueprint
 * POST /api/admin/blueprints
 */
export const createBlueprint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Admin should be attached by auth middleware
    const adminId = req.admin?.id;
    if (!adminId) {
      throw new Error('Admin not authenticated');
    }

    // Validate request body
    const validatedData = validateCreateBlueprint(req.body);

    // Create blueprint
    const blueprint = await blueprintService.createBlueprint(validatedData, adminId);

    res.status(201).json({
      success: true,
      message: 'Service blueprint created successfully',
      data: { blueprint },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blueprint by service code
 * GET /api/admin/blueprints/code/:serviceCode
 */
export const getBlueprintByCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { serviceCode } = req.params;
    
    const blueprint = await blueprintService.getBlueprintByCode(serviceCode);

    if (!blueprint) {
      res.status(404).json({
        success: false,
        message: 'Blueprint not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { blueprint },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blueprint by service slug
 * GET /api/admin/blueprints/slug/:slug
 */
export const getBlueprintBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const blueprint = await blueprintService.getBlueprintBySlug(slug);

    if (!blueprint) {
      res.status(404).json({
        success: false,
        message: 'Blueprint not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { blueprint },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all blueprints
 * GET /api/admin/blueprints
 */
export const getAllBlueprints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { active } = req.query;
    
    const filters: { isActive?: boolean } = {};
    if (active === 'true') filters.isActive = true;
    if (active === 'false') filters.isActive = false;

    const blueprints = await blueprintService.getAllBlueprints(filters);

    res.status(200).json({
      success: true,
      data: { blueprints },
      count: blueprints.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a blueprint
 * PUT /api/admin/blueprints/:serviceCode
 */
export const updateBlueprint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      throw new Error('Admin not authenticated');
    }

    const { serviceCode } = req.params;
    
    // Validate request body
    const validatedData = validateUpdateBlueprint(req.body);

    const blueprint = await blueprintService.updateBlueprint(
      serviceCode,
      validatedData,
      adminId
    );

    res.status(200).json({
      success: true,
      message: 'Blueprint updated successfully',
      data: { blueprint },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (deactivate) a blueprint
 * DELETE /api/admin/blueprints/:serviceCode
 */
export const deleteBlueprint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { serviceCode } = req.params;
    
    await blueprintService.deleteBlueprint(serviceCode);

    res.status(200).json({
      success: true,
      message: 'Blueprint deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};