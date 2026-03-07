/**
 * FILE: core/utils/formatResponse.ts
 *
 * PURPOSE
 * Standardizes API responses.
 *
 * IMPORTED IN
 * - All controllers
 *
 * DEPENDENCIES
 * None
 */

export const formatResponse = (
  success: boolean,
  message: string,
  data: any = null
) => {
  return {
    success,
    message,
    data
  };
};