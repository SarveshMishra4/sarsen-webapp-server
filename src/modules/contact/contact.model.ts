/**
PURPOSE
Database schema for contact form submissions.

USED BY
contact.service.ts

IMPORTED IN
contact.service.ts
*/

import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
{
 name: {
  type: String,
  required: true
 },

 email: {
  type: String,
  required: true
 },

 message: {
  type: String,
  required: true
 },

 status: {
  type: String,
  enum: ["new", "contacted", "resolved"],
  default: "new"
 }

},
{
 timestamps: true
}
);

export const ContactModel = mongoose.model(
"Contact",
ContactSchema
);