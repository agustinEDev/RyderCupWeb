/**
 * Country Utilities
 * Helper functions for working with country codes and flag emojis
 *
 * Uses Unicode Regional Indicator Symbols to generate flag emojis dynamically
 * for ANY ISO 3166-1 alpha-2 country code (works for all ~195 countries)
 */

/**
 * Converts a country code to its flag emoji
 * Uses Unicode Regional Indicator Symbols (U+1F1E6 - U+1F1FF)
 *
 * Examples:
 *   'ES' → '🇪🇸'
 *   'FR' → '🇫🇷'
 *   'US' → '🇺🇸'
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'ES', 'FR', 'US')
 * @returns {string} - Flag emoji or empty string if invalid
 */
export const getCountryFlag = (countryCode) => {
  if (!countryCode || typeof countryCode !== 'string') {
    return '';
  }

  const code = countryCode.trim().toUpperCase();

  // Validate: must be exactly 2 letters A-Z
  if (!/^[A-Z]{2}$/.test(code)) {
    return '';
  }

  // Convert each letter to Regional Indicator Symbol
  // A = U+1F1E6 (🇦), B = U+1F1E7 (🇧), ..., Z = U+1F1FF (🇿)
  // Formula: charCode('A') = 65, offset = 127397, so 65 + 127397 = 127462 = U+1F1E6
  const flag = code
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('');

  return flag;
};

/**
 * Get country information for UI display
 * Note: This does NOT include country names - those come from the backend
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'ES')
 * @returns {Object|null} - { code, flag } or null if invalid
 */
export const getCountryInfo = (countryCode) => {
  if (!countryCode) return null;

  const code = countryCode.trim().toUpperCase();
  const flag = getCountryFlag(code);

  if (!flag) return null;

  return {
    code,
    flag
  };
};

/**
 * Get multiple countries information from an array of codes
 * Filters out null/undefined/empty values
 *
 * @param {Array<string>} countryCodes - Array of country codes (e.g., ['ES', 'FR', 'IT'])
 * @returns {Array<Object>} - Array of { code, flag } objects
 */
export const getCountriesInfo = (countryCodes) => {
  if (!Array.isArray(countryCodes)) {
    return [];
  }

  return countryCodes
    .filter(code => code !== null && code !== undefined && code !== '')
    .map(code => getCountryInfo(code))
    .filter(info => info !== null);
};
