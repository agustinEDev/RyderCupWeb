/**
 * Country Utilities
 * Helper functions for working with country codes and flag emojis
 *
 * Uses Unicode Regional Indicator Symbols to generate flag emojis dynamically
 * for ANY ISO 3166-1 alpha-2 country code (works for all ~195 countries)
 *
 * UPDATE (Feb 2026): Replaced country-flag-icons SVG bundle (239 KB) with
 * flagcdn.com CDN images for consistent cross-browser rendering at zero bundle cost.
 */

import React from 'react';

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
export const canUseRFEG = (user) => {
  console.log('🔍 [canUseRFEG] Checking RFEG eligibility:', {
    hasUser: !!user,
    userType: typeof user,
    hasCountryCode: !!(user?.country_code),
    countryCode: user?.country_code,
    countryCodeType: typeof user?.country_code
  });

  // Validate user object exists
  if (!user || typeof user !== 'object') {
    console.log('❌ [canUseRFEG] User object invalid');
    return false;
  }

  // User must have a country_code defined
  if (!user.country_code) {
    console.log('❌ [canUseRFEG] User has no country_code');
    return false;
  }

  // Only Spanish users (ES) can use RFEG
  const isSpanish = user.country_code.toUpperCase() === 'ES';
  console.log(isSpanish ? '✅ [canUseRFEG] User is Spanish' : '❌ [canUseRFEG] User is not Spanish:', user.country_code);
  return isSpanish;
};

/**
 * Get flag image component for a country code
 * Uses flagcdn.com CDN for consistent rendering across all browsers
 * (fixes Chrome/Windows issues with Unicode flag emojis)
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'ES', 'FR', 'US')
 * @param {string} className - Optional CSS class names
 * @param {Object} style - Optional inline styles
 * @param {string} title - Optional title/tooltip text
 * @returns {JSX.Element|null} - img element or null if invalid
 *
 * Examples:
 *   <CountryFlag countryCode="ES" className="w-6 h-6" />
 *   <CountryFlag countryCode="FR" style={{ width: '24px', height: 'auto' }} />
 */
export const CountryFlag = ({ countryCode, className = '', style = {}, title = '' }) => {
  if (!countryCode || typeof countryCode !== 'string') {
    return null;
  }

  const code = countryCode.trim().toUpperCase();

  // Validate: must be exactly 2 letters A-Z
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }

  const lowerCode = code.toLowerCase();

  return React.createElement('img', {
    src: `https://flagcdn.com/w40/${lowerCode}.png`,
    srcSet: `https://flagcdn.com/w80/${lowerCode}.png 2x`,
    width: 40,
    height: 30,
    alt: title || code,
    title: title || undefined,
    className,
    loading: 'lazy',
    style: { display: 'inline-block', verticalAlign: 'middle', ...style },
    onError: (e) => {
      const fallback = getCountryFlag(code);
      if (fallback) {
        const span = document.createElement('span');
        span.textContent = fallback;
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', title || code);
        e.target.replaceWith(span);
      }
    }
  });
};
