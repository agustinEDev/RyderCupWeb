/**
 * Country Utilities
 * Helper functions for working with country codes and flag emojis
 *
 * Uses Unicode Regional Indicator Symbols to generate flag emojis dynamically
 * for ANY ISO 3166-1 alpha-2 country code (works for all ~195 countries)
 *
 * UPDATE (Nov 2025): Added SVG flag support using country-flag-icons
 * to fix rendering issues in Chrome/Windows
 */

import React from 'react';
import * as flags from 'country-flag-icons/react/3x2';

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
 * Get SVG flag component for a country code
 * Uses country-flag-icons library for consistent rendering across all browsers
 * Fixes Chrome/Windows rendering issues with Unicode flag emojis
 *
 * @param {string} countryCode - ISO 3166-1 alpha-2 code (e.g., 'ES', 'FR', 'US')
 * @param {Object} props - Optional props for the SVG (className, style, etc.)
 * @returns {JSX.Element|null} - React SVG component or null if invalid
 *
 * Examples:
 *   <CountryFlag countryCode="ES" className="w-6 h-6" />
 *   <CountryFlag countryCode="FR" style={{ width: '24px', height: '24px' }} />
 */
export const CountryFlag = ({ countryCode, className = '', style = {} }) => {
  if (!countryCode || typeof countryCode !== 'string') {
    return null;
  }

  const code = countryCode.trim().toUpperCase();

  // Validate: must be exactly 2 letters A-Z
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }

  // Get the flag component from the flags object
  // The country code becomes the key (e.g., 'ES', 'FR', 'US')
  const FlagComponent = flags[code];

  if (!FlagComponent) {
    // If flag doesn't exist, log warning and return null
    console.warn(`⚠️ SVG flag not found for country code: ${code}`);
    return null;
  }

  return React.createElement(FlagComponent, {
    className,
    style: { display: 'inline-block', verticalAlign: 'middle', ...style }
  });
};
