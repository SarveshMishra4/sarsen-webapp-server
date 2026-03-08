/**
 * FILE: modules/services/services.service.ts
 *
 * PURPOSE
 * Business logic for service catalog.
 */

import {
  createService,
  getAllServices,
  getActiveServices,
  updateService,
  deleteService,
} from "./services.model.js";

/**
 * Admin creates service
 */
export const addService = async (
  title: string,
  description: string,
  price: number,
  duration: string
) => {
  return createService(title, description, price, duration);
};

/**
 * Fetch all services (admin)
 */
export const fetchAllServices = async () => {
  return getAllServices();
};

/**
 * Fetch active services (public)
 */
export const fetchActiveServices = async () => {
  return getActiveServices();
};

/**
 * Update service
 */
export const editService = async (
  id: string,
  data: any
) => {
  return updateService(id, data);
};

/**
 * Delete service
 */
export const removeService = async (id: string) => {
  return deleteService(id);
};