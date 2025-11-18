/**
 * Countries Service
 * Handles country data and adjacency queries
 */

import apiRequest from './api';

/**
 * Get all active countries
 * @returns {Promise<array>} List of countries
 */
export const getCountries = async () => {
  try {
    return await apiRequest('/api/v1/countries', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    // Return fallback data if API fails
    return FALLBACK_COUNTRIES;
  }
};

/**
 * Get adjacent countries for a given country code
 * @param {string} countryCode - ISO country code (e.g., 'ES')
 * @returns {Promise<array>} List of adjacent countries
 */
export const getAdjacentCountries = async (countryCode) => {
  try {
    return await apiRequest(`/api/v1/countries/${countryCode}/adjacent`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('Error fetching adjacent countries:', error);
    // Return empty array if API fails
    return [];
  }
};

/**
 * Get countries that are adjacent to multiple countries (intersection)
 * Used for finding valid third country that's adjacent to both first and second
 * @param {string} countryCode1 - First country code
 * @param {string} countryCode2 - Second country code
 * @returns {Promise<array>} List of countries adjacent to both
 */
export const getCommonAdjacentCountries = async (countryCode1, countryCode2) => {
  try {
    const adjacent1 = await getAdjacentCountries(countryCode1);
    const adjacent2 = await getAdjacentCountries(countryCode2);

    // Find intersection (countries that are adjacent to both)
    const codes1 = new Set(adjacent1.map(c => c.code));
    const common = adjacent2.filter(c => codes1.has(c.code));

    return common;
  } catch (error) {
    console.error('Error fetching common adjacent countries:', error);
    return [];
  }
};

/**
 * Fallback country data (European countries)
 * Used if backend API is not available yet
 */
const FALLBACK_COUNTRIES = [
  { code: 'ES', name_en: 'Spain', name_es: 'España' },
  { code: 'FR', name_en: 'France', name_es: 'Francia' },
  { code: 'IT', name_en: 'Italy', name_es: 'Italia' },
  { code: 'PT', name_en: 'Portugal', name_es: 'Portugal' },
  { code: 'DE', name_en: 'Germany', name_es: 'Alemania' },
  { code: 'GB', name_en: 'United Kingdom', name_es: 'Reino Unido' },
  { code: 'IE', name_en: 'Ireland', name_es: 'Irlanda' },
  { code: 'BE', name_en: 'Belgium', name_es: 'Bélgica' },
  { code: 'NL', name_en: 'Netherlands', name_es: 'Países Bajos' },
  { code: 'CH', name_en: 'Switzerland', name_es: 'Suiza' },
  { code: 'AT', name_en: 'Austria', name_es: 'Austria' },
  { code: 'SE', name_en: 'Sweden', name_es: 'Suecia' },
  { code: 'NO', name_en: 'Norway', name_es: 'Noruega' },
  { code: 'DK', name_en: 'Denmark', name_es: 'Dinamarca' },
  { code: 'PL', name_en: 'Poland', name_es: 'Polonia' },
  { code: 'CZ', name_en: 'Czech Republic', name_es: 'República Checa' },
  { code: 'GR', name_en: 'Greece', name_es: 'Grecia' },
];

/**
 * Fallback adjacency data
 * Maps country codes to their adjacent countries
 */
const FALLBACK_ADJACENCIES = {
  'ES': ['FR', 'PT', 'AD'],
  'FR': ['ES', 'IT', 'CH', 'DE', 'BE', 'LU', 'AD', 'MC'],
  'IT': ['FR', 'CH', 'AT', 'SI', 'SM', 'VA'],
  'PT': ['ES'],
  'DE': ['FR', 'CH', 'AT', 'CZ', 'PL', 'NL', 'BE', 'LU', 'DK'],
  'GB': ['IE'],
  'IE': ['GB'],
  'BE': ['FR', 'DE', 'NL', 'LU'],
  'NL': ['DE', 'BE'],
  'CH': ['FR', 'IT', 'AT', 'DE', 'LI'],
  'AT': ['DE', 'CZ', 'SK', 'HU', 'SI', 'IT', 'CH', 'LI'],
  'SE': ['NO', 'FI'],
  'NO': ['SE', 'FI', 'RU'],
  'DK': ['DE', 'SE'],
  'PL': ['DE', 'CZ', 'SK', 'UA', 'BY', 'LT', 'RU'],
  'CZ': ['DE', 'PL', 'SK', 'AT'],
  'GR': ['AL', 'MK', 'BG', 'TR'],
};

/**
 * Get adjacent countries from fallback data
 * @param {string} countryCode
 * @returns {array}
 */
export const getAdjacentCountriesFallback = (countryCode) => {
  const adjacentCodes = FALLBACK_ADJACENCIES[countryCode] || [];
  return FALLBACK_COUNTRIES.filter(c => adjacentCodes.includes(c.code));
};

/**
 * Format country name based on user's language preference
 * @param {object} country - Country object with name_en and name_es
 * @param {string} language - 'en' or 'es'
 * @returns {string}
 */
export const formatCountryName = (country, language = 'en') => {
  return language === 'es' ? country.name_es : country.name_en;
};
