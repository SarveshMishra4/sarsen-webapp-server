/**
 * Identity Routes
 *
 * Defines all authentication related routes.
 */

import { Router } from "express";
import { setupAdmin, adminLogin } from "./identity.controller.js";

const router = Router();

/**
 * Create first admin
 */
router.post("/admin/setup", setupAdmin);

/**
 * Admin login
 */
router.post("/admin/login", adminLogin);

export default router;