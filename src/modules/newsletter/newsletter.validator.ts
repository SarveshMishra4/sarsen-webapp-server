/**
 * Newsletter Validator
 */

export const validateEmail = (email: string) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const emailRegex = /\S+@\S+\.\S+/;

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
};