/**
PURPOSE
Handle contact API requests.

USED BY
contact.routes.ts

IMPORTED IN
contact.routes.ts
*/

import { Request, Response } from "express";

import {
 createContactMessage,
 getAllContacts,
 updateContactStatus
} from "./contact.service.js";


export const submitContactForm = async (
req: Request,
res: Response
) => {

 try {

  const { name, email, message } = req.body;

  const contact = await createContactMessage(
   name,
   email,
   message
  );

  return res.status(201).json({
   success: true,
   message: "Message submitted successfully",
   data: contact
  });

 } catch (error) {

  return res.status(500).json({
   success: false,
   message: "Failed to submit contact form"
  });

 }

};


export const getContacts = async (
req: Request,
res: Response
) => {

 const contacts = await getAllContacts();

 return res.json({
  success: true,
  data: contacts
 });

};


export const updateStatus = async (
req: Request,
res: Response
) => {

 const { id } = req.params;
 const { status } = req.body;

 const contact = await updateContactStatus(
  id as string, // Fix applied here: asserted 'id' as a string
  status
 );

 return res.json({
  success: true,
  data: contact
 });

};