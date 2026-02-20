import { Request, Response, NextFunction } from 'express';
import { ServiceBlueprint } from '../models/ServiceBlueprint.model';
import { ApiError } from '../middleware/error.middleware';

/**
 * GET /api/public/validate/:slug
 * Validate if a service exists and is active (public endpoint)
 */
export const validateService = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Find the service blueprint by slug (case insensitive)
    const blueprint = await ServiceBlueprint.findOne({
      serviceSlug: slug.toLowerCase(),
      isActive: true
    }).select('serviceCode serviceName serviceSlug isActive');
    
    if (!blueprint) {
      res.status(404).json({
        success: false,
        message: 'Service not found or inactive'
      });
      return; // 👈 Important: return after sending response
    }
    
    res.status(200).json({
      success: true,
      data: {
        exists: true,
        isActive: blueprint.isActive,
        serviceCode: blueprint.serviceCode,
        serviceName: blueprint.serviceName,
        serviceSlug: blueprint.serviceSlug
      }
    });
    return; // 👈 Optional but good practice
  } catch (error) {
    next(error); // Pass error to error handler
    return; // 👈 Important: return after calling next
  }
};