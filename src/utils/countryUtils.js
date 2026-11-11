/**
 * Country Utilities
 * Helper functions for working with country codes and flag emojis
 *
 * Uses Unicode Regional Indicator Symbols to generate flag emojis dynamically
 * for ANY ISO 3166-1 alpha-2 country code (works for all ~195 countries)
 *
 * UPDATE (Feb 2026): Replaced country-flag-icons SVG bundle (239 KB) with
 * flagcdn.com CDN images for consistent cross-browser rendering at zero bundle cost.
 *
 * Sin React (9 nov 2026): el componente `CountryFlag` vive en
 * `components/ui/CountryFlag.jsx`. Aquí estaba también, y por este fichero los
 * casos de uso (CompetitionAssembler) llegaban a React sin importarlo.
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
 * Check if a user can use RFEG (Real Federación Española de Golf) handicap updates
 * Only users with Spanish nationality (ES) can update their handicap from RFEG
 *
 * Business Rule: RFEG is only available for Spanish players
 *
 * @param {Object} user - User object from localStorage or API
 * @param {string|null} user.country_code - User's country code (ISO 3166-1 alpha-2)
 * @returns {boolean} - true if user can use RFEG, false otherwise
 *
 * Examples:
 *   canUseRFEG({ country_code: 'ES' }) → true
 *   canUseRFEG({ country_code: 'FR' }) → false
 *   canUseRFEG({ country_code: null }) → false
 *   canUseRFEG(null) → false
 */
// Sin consola (25 oct 2026): Sentry la recoge como migas, y el país del
// usuario salía en cada error de la pantalla de perfil
export const canUseRFEG = (user) => {
  if (!user || typeof user !== 'object') return false;
  // Only Spanish users (ES) can use RFEG
  return Boolean(user.country_code) && user.country_code.toUpperCase() === 'ES';
};
