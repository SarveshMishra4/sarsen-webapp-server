import { Service, IService, IChecklistStep } from './services.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

export const servicesService = {

  async createService(data: {
    title: string;
    description: string;
    price: number;
    type: 'service' | 'cohort';
    defaultChecklist: IChecklistStep[];
  }): Promise<IService> {
    const service = await Service.create(data);

    logger.info('[Services] New service created', {
      id:    service._id.toString(),
      title: service.title,
      type:  service.type,
      price: service.price,
    });

    return service;
  },

  async updateService(
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      defaultChecklist?: IChecklistStep[];
    }
  ): Promise<IService> {
    const service = await Service.findByIdAndUpdate(id, data, { new: true });
    if (!service) throw new AppError('Service not found', 404);

    logger.info('[Services] Service updated', { id });

    return service;
  },

  async updateStatus(id: string, isActive: boolean): Promise<IService> {
    const service = await Service.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );
    if (!service) throw new AppError('Service not found', 404);

    logger.info('[Services] Service status updated', { id, isActive });

    return service;
  },

  // Public — only active services
  async getAllActiveServices(): Promise<IService[]> {
    return Service.find({ isActive: true }).sort({ createdAt: -1 });
  },

  // Public — single active service by ID
  async getActiveServiceById(id: string): Promise<IService> {
    const service = await Service.findOne({ _id: id, isActive: true });
    if (!service) throw new AppError('Service not found', 404);
    return service;
  },

  // Internal use only — used by purchase flow to fetch any service (active or not)
  async getServiceByIdInternal(id: string): Promise<IService> {
    const service = await Service.findById(id);
    if (!service) throw new AppError('Service not found', 404);
    return service;
  },
};
