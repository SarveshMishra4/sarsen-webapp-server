/**
PURPOSE
Handle request and response cycle.

USED BY
newsletter.routes.ts
*/

import { Request, Response } from "express";
import { createSubscriber } from "./newsletter.service.js";

export const subscribeNewsletter = async (
req: Request,
res: Response
) => {

 try {

  console.log("Newsletter subscription request received");

  const { email } = req.body;

  const result = await createSubscriber(email);

  return res.status(200).json(result);

 } catch (error) {

  console.error("Newsletter controller error");

  return res.status(500).json({
   success: false,
   message: "Internal server error"
  });

 }
};