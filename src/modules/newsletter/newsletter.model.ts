/**
PURPOSE
Database schema for newsletter subscribers.

USED BY
newsletter.service.ts
*/

import mongoose from "mongoose";

console.log("Loading Newsletter Model");

const NewsletterSchema = new mongoose.Schema(
{
 email: {
  type: String,
  required: true,
  unique: true
 }
},
{
 timestamps: true
}
);

export const NewsletterModel = mongoose.model(
"NewsletterSubscriber",
NewsletterSchema
);

console.log("Newsletter Model Loaded");