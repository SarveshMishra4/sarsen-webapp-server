/**
PURPOSE
Defines API routes for contact form feature.

IMPORTED IN
server.ts

ROUTE PREFIX
/api/contact
*/

import express from "express";

import {
 submitContactForm,
 getContacts,
 updateStatus
} from "./contact.controller.js";

import { validateContactInput } from "./contact.validator.js";

const router = express.Router();

router.post(
"/submit",
validateContactInput,
submitContactForm
);

router.get(
"/all",
getContacts
);

router.patch(
"/:id/status",
updateStatus
);

export default router;