/**
 * Date formatting utilities for consistent date display across the application
 * @module utils/dateFormatters
 */

/**
 * Formats a date string to a localized date with time (e.g., "Jan 10, 2025, 3:45 PM")
 * Uses the browser's locale for automatic localization
 *
 * @param {string|Date} dateString - ISO date string or Date object to format
 * @param {string} fallbackText - Text to display when date is invalid or null (default: 'Never')
 * @returns {string} Formatted date string or fallback text
 *
 * @example
 * formatDateTime('2025-01-10T15:45:00Z', 'Never')
 * // Returns: "Jan 10, 2025, 3:45 PM" (in English locale)
 * // Returns: "10 ene 2025, 15:45" (in Spanish locale)
 */
export const formatDateTime = (dateString, fallbackText = 'Never') => {
  if (!dateString) return fallbackText;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallbackText;

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date with time:', error);
    return fallbackText;
  }
};

/**
 * Formats a date string to a full localized date (e.g., "January 10, 2025")
 * Uses the browser's locale for automatic localization
 *
 * @param {string|Date} dateString - ISO date string or Date object to format
 * @param {string} fallbackText - Text to display when date is invalid or null (default: 'N/A')
 * @returns {string} Formatted date string or fallback text
 *
 * @example
 * formatFullDate('2025-01-10T15:45:00Z')
 * // Returns: "January 10, 2025" (in English locale)
 * // Returns: "10 de enero de 2025" (in Spanish locale)
 */
export const formatFullDate = (dateString, fallbackText = 'N/A') => {
  if (!dateString) return fallbackText;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallbackText;

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting full date:', error);
    return fallbackText;
  }
};

/**
 * Formats a date string to a short localized date (e.g., "Jan 10, 2025")
 * Uses the browser's locale for automatic localization
 *
 * @param {string|Date} dateString - ISO date string or Date object to format
 * @param {string} fallbackText - Text to display when date is invalid or null (default: 'N/A')
 * @returns {string} Formatted date string or fallback text
 *
 * @example
 * formatShortDate('2025-01-10T15:45:00Z')
 * // Returns: "Jan 10, 2025" (in English locale)
 * // Returns: "10 ene 2025" (in Spanish locale)
 */
export const formatShortDate = (dateString, fallbackText = 'N/A') => {
  if (!dateString) return fallbackText;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallbackText;

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting short date:', error);
    return fallbackText;
  }
};
