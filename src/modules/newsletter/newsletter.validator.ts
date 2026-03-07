/**
PURPOSE
Validate incoming request data.

USED BY
newsletter.routes.ts
*/

import { Request, Response, NextFunction } from "express";

export const validateNewsletterInput = (
req: Request,
res: Response,
next: NextFunction
) => {

 console.log("Validating newsletter input");

 const { email } = req.body;

 if (!email) {
  console.log("Email missing");
  return res.status(400).json({
   success: false,
   message: "Email is required"
  });
 }

 const emailRegex = /\S+@\S+\.\S+/;

 if (!emailRegex.test(email)) {
  console.log("Invalid email format");
  return res.status(400).json({
   success: false,
   message: "Invalid email format"
  });
 }

 console.log("Validation passed");

 next();
};