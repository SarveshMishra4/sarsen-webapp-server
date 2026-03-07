import { Router } from "express";
import {
  getAllMessages,
  markMessageCompleted,
  deleteMessage
} from "./adminContact.controller.js";

const router = Router();

/*
Route: GET /api/admin/messages
Purpose: Fetch all contact messages
*/
router.get("/", getAllMessages);

/*
Route: PATCH /api/admin/messages/:id/complete
Purpose: Mark message as resolved
*/
router.patch("/:id/complete", markMessageCompleted);

/*
Route: DELETE /api/admin/messages/:id
Purpose: Delete a message
*/
router.delete("/:id", deleteMessage);

export default router;