/**
PURPOSE
Handles business logic for newsletter subscription.

USED BY
newsletter.controller.ts
*/

import { NewsletterModel } from "./newsletter.model.js";

export const createSubscriber = async (email: string) => {

 console.log("Creating newsletter subscriber");

 const existingSubscriber = await NewsletterModel.findOne({ email });

 if (existingSubscriber) {

  console.log("Subscriber already exists");

  return {
   success: false,
   message: "Already subscribed"
  };
 }

 const newSubscriber = await NewsletterModel.create({ email });

 console.log("Subscriber saved to database");

 return {
  success: true,
  message: "Subscribed successfully",
  data: newSubscriber
 };
};