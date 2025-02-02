/**
 * Utility function to format a MongoDB date for display in the UI.
 * It converts a MongoDB date to an ISO string and extracts the date part (YYYY-MM-DD).
 * If the date is falsy (null, undefined, or empty), it returns an empty string.
 *
 * @param {string | Date} date - The MongoDB date value to be formatted.
 * @returns {string} - The formatted date as 'YYYY-MM-DD' or an empty string if no valid date is provided.
 */
const formatMongoDateForUIAsYYYYMMDD = (date) => {
  // Check if the date is truthy (not null, undefined, or empty).
  // If valid, convert it to an ISO string and split at the 'T' to keep only the date part.
  // If the date is falsy, return an empty string.
  return date ? new Date(date).toISOString().split('T')[0] : '';
};

/**
 * Formats a date to the "DD MMM YYYY" format (e.g., "25 Sept 2025").
 * 
 * @param {*} date - The date to be formatted. It can be a string, Date object, or timestamp.
 * @returns {string} - The formatted date in the "DD MMM YYYY" format, or an empty string if the date is invalid.
 */
const formatMongoDateForUIAsYYYYMMMDD = (date) => {
  // Check if the date is valid (not null, undefined, or empty).
  if (!date) return ''; // If invalid, return an empty string.

  // Define the format options for the date: 
  // - 'day' with '2-digit' ensures a two-digit day (e.g., '25').
  // - 'month' with 'short' gives the abbreviated month name (e.g., 'Sept').
  // - 'year' with 'numeric' gives the full year (e.g., '2025').
  const options = { year: 'numeric', month: 'short', day: '2-digit' };
  
  // Use toLocaleDateString to format the date with 'en-GB' locale, which gives the desired format "25 Sept 2025".
  const formattedDate = new Date(date).toLocaleDateString('en-GB', options); 
  
  // Return the formatted date.
  return formattedDate;
};



/**
 * Utility service containing helper functions related to UI formatting.
 */
const UtilityService = {
  formatMongoDateForUIAsYYYYMMDD,
  formatMongoDateForUIAsYYYYMMMDD
};

// Export the UtilityService object
module.exports = UtilityService;
