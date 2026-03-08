/**
 * FILE: modules/services/services.controller.ts
 *
 * PURPOSE
 * Handles HTTP requests for service catalog.
 */

import { Request, Response } from "express";
import {
  addService,
  fetchAllServices,
  fetchActiveServices,
  editService,
  removeService,
} from "./services.service.js";

/**
 * Admin creates service
 */
export const createServiceController = async (
  req: Request,
  res: Response
) => {
  try {
    const { title, description, price, duration } = req.body;

    const service = await addService(
      title,
      description,
      price,
      duration
    );

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create service",
    });
  }
};

/**
 * Admin fetches all services
 */
export const getAllServicesController = async (
  req: Request,
  res: Response
) => {
  const services = await fetchAllServices();

  res.json({
    success: true,
    data: services,
  });
};

/**
 * Public fetch active services
 */
export const getActiveServicesController = async (
  req: Request,
  res: Response
) => {
  const services = await fetchActiveServices();

  res.json({
    success: true,
    data: services,
  });
};

/**
 * Update service
 */
export const updateServiceController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  const service = await editService(id as string, req.body);

  res.json({
    success: true,
    data: service,
  });
};

/**
 * Delete service
 */
export const deleteServiceController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  await removeService(id as string);

  res.json({
    success: true,
    message: "Service deleted",
  });
};