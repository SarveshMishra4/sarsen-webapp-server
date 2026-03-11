import { Request, Response, NextFunction } from 'express';
import { servicesService } from './services.service.js';
import {
  createServiceSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
} from './services.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const servicesController = {

  async createService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid service data provided';
        throw new AppError(errorMessage, 400);
      }

      const service = await servicesService.createService(parsed.data);

      res.status(201).json(
        formatResponse(true, 'Service created successfully.', service)
      );
    } catch (err) {
      next(err);
    }
  },

  async updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid update data provided';
        throw new AppError(errorMessage, 400);
      }

      // FIX: Explicitly cast the URL param as a string
      const id = req.params.id as string;
      
      // FIX: Extract the exact input type from the service to satisfy exactOptionalPropertyTypes
      type UpdateInput = Parameters<typeof servicesService.updateService>[1];
      
      // Cast parsed.data to match the service's strict requirements
      const service = await servicesService.updateService(id, parsed.data as UpdateInput);

      res.status(200).json(
        formatResponse(true, 'Service updated successfully.', service)
      );
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateServiceStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use optional chaining on '.issues' with a fallback string
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid status provided';
        throw new AppError(errorMessage, 400);
      }

      // FIX: Explicitly cast the URL param as a string
      const id = req.params.id as string;
      const service = await servicesService.updateStatus(id, parsed.data.isActive);

      res.status(200).json(
        formatResponse(
          true,
          `Service ${parsed.data.isActive ? 'enabled' : 'disabled'} successfully.`,
          service
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async getAllActiveServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const services = await servicesService.getAllActiveServices();

      res.status(200).json(
        formatResponse(true, 'Services retrieved.', {
          services,
          total: services.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // FIX: Explicitly cast the URL param as a string
      const id = req.params.id as string;
      const service = await servicesService.getActiveServiceById(id);

      res.status(200).json(
        formatResponse(true, 'Service retrieved.', service)
      );
    } catch (err) {
      next(err);
    }
  },
};