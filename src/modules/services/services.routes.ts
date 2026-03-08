/**
 * FILE: modules/services/services.routes.ts
 *
 * PURPOSE
 * API routes for service catalog.
 */

import { Router } from "express";
import {
  createServiceController,
  getAllServicesController,
  getActiveServicesController,
  updateServiceController,
  deleteServiceController,
} from "./services.controller.js";

const router = Router();

/**
 * Admin creates service
 */
router.post("/", createServiceController);

/**
 * Admin fetches all services
 */
router.get("/admin", getAllServicesController);

/**
 * Public fetch active services
 */
router.get("/", getActiveServicesController);

/**
 * Update service
 */
router.put("/:id", updateServiceController);

/**
 * Delete service
 */
router.delete("/:id", deleteServiceController);

export default router;