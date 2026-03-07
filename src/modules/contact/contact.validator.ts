/**
PURPOSE
Validate contact form input.

USED BY
contact.routes.ts

IMPORTED IN
contact.routes.ts
*/

import { Request, Response, NextFunction } from "express";

export const validateContactInput = (
req: Request,
res: Response,
next: NextFunction
) => {

 const { name, email, message } = req.body;

 if (!name || !email || !message) {

  return res.status(400).json({
   success: false,
   message: "All fields are required"
  });

 }

 const emailRegex = /\S+@\S+\.\S+/;

 if (!emailRegex.test(email)) {

  return res.status(400).json({
   success: false,
   message: "Invalid email format"
  });

 }

 next();
};