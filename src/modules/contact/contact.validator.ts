/**
 * Contact Validator
 */

export const validateContact = (
  name: string,
  email: string,
  message: string
) => {
  if (!name) throw new Error("Name required");
  if (!email) throw new Error("Email required");
  if (!message) throw new Error("Message required");
};