/**
PURPOSE
Define API endpoints for newsletter feature.

IMPORTED IN
app.ts or server.ts
*/

import express from "express";
import { subscribeNewsletter } from "./newsletter.controller.js";
import { validateNewsletterInput } from "./newsletter.validator.js";

const router = express.Router();

console.log("Newsletter routes initialized");

router.post(
"/subscribe",
validateNewsletterInput,
subscribeNewsletter
);

export default router;