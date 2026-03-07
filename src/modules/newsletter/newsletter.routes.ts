/**
 * Newsletter Routes
 */

import { Router } from "express";
import { subscribeNewsletter } from "./newsletter.controller.js";

const router = Router();

router.post("/subscribe", subscribeNewsletter);

export default router;