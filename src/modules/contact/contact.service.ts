/**
PURPOSE
Business logic for contact form system.

USED BY
contact.controller.ts

IMPORTED IN
contact.controller.ts
*/

import { ContactModel } from "./contact.model.js";

export const createContactMessage = async (
name: string,
email: string,
message: string
) => {

 const contact = await ContactModel.create({
  name,
  email,
  message
 });

 return contact;

};


export const getAllContacts = async () => {

 const contacts = await ContactModel
  .find()
  .sort({ createdAt: -1 });

 return contacts;

};


export const updateContactStatus = async (
id: string,
status: string
) => {

 const contact = await ContactModel.findByIdAndUpdate(
  id,
  { status },
  { new: true }
 );

 return contact;

};