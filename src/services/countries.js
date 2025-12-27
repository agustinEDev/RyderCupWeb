/**
 * Countries Service
 * Handles country data and adjacency queries
 */

import { apiRequest } from './api';

/**
 * Get all active countries
 * @returns {Promise<array>} List of countries with name_en and name_es
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
 * @returns {Promise<array>} List of adjacent countries with name_en and name_es
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
 * @returns {Promise<array>} List of countries adjacent to both with name_en and name_es
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
 * Fallback country data (Global countries sorted alphabetically)
 * Used if backend API is not available yet
 */
const FALLBACK_COUNTRIES = [
  // Europe
  { code: 'AD', name_en: 'Andorra', name_es: 'Andorra', active: true },
  { code: 'AL', name_en: 'Albania', name_es: 'Albania', active: true },
  { code: 'AT', name_en: 'Austria', name_es: 'Austria', active: true },
  { code: 'BE', name_en: 'Belgium', name_es: 'Bélgica', active: true },
  { code: 'BG', name_en: 'Bulgaria', name_es: 'Bulgaria', active: true },
  { code: 'CH', name_en: 'Switzerland', name_es: 'Suiza', active: true },
  { code: 'CZ', name_en: 'Czech Republic', name_es: 'República Checa', active: true },
  { code: 'DE', name_en: 'Germany', name_es: 'Alemania', active: true },
  { code: 'DK', name_en: 'Denmark', name_es: 'Dinamarca', active: true },
  { code: 'ES', name_en: 'Spain', name_es: 'España', active: true },
  { code: 'FI', name_en: 'Finland', name_es: 'Finlandia', active: true },
  { code: 'FR', name_en: 'France', name_es: 'Francia', active: true },
  { code: 'GB', name_en: 'United Kingdom', name_es: 'Reino Unido', active: true },
  { code: 'GR', name_en: 'Greece', name_es: 'Grecia', active: true },
  { code: 'HR', name_en: 'Croatia', name_es: 'Croacia', active: true },
  { code: 'HU', name_en: 'Hungary', name_es: 'Hungría', active: true },
  { code: 'IE', name_en: 'Ireland', name_es: 'Irlanda', active: true },
  { code: 'IS', name_en: 'Iceland', name_es: 'Islandia', active: true },
  { code: 'IT', name_en: 'Italy', name_es: 'Italia', active: true },
  { code: 'LU', name_en: 'Luxembourg', name_es: 'Luxemburgo', active: true },
  { code: 'NL', name_en: 'Netherlands', name_es: 'Países Bajos', active: true },
  { code: 'NO', name_en: 'Norway', name_es: 'Noruega', active: true },
  { code: 'PL', name_en: 'Poland', name_es: 'Polonia', active: true },
  { code: 'PT', name_en: 'Portugal', name_es: 'Portugal', active: true },
  { code: 'RO', name_en: 'Romania', name_es: 'Rumania', active: true },
  { code: 'SE', name_en: 'Sweden', name_es: 'Suecia', active: true },
  { code: 'SI', name_en: 'Slovenia', name_es: 'Eslovenia', active: true },
  { code: 'SK', name_en: 'Slovakia', name_es: 'Eslovaquia', active: true },

  // Americas
  { code: 'AR', name_en: 'Argentina', name_es: 'Argentina', active: true },
  { code: 'BO', name_en: 'Bolivia', name_es: 'Bolivia', active: true },
  { code: 'BR', name_en: 'Brazil', name_es: 'Brasil', active: true },
  { code: 'CA', name_en: 'Canada', name_es: 'Canadá', active: true },
  { code: 'CL', name_en: 'Chile', name_es: 'Chile', active: true },
  { code: 'CO', name_en: 'Colombia', name_es: 'Colombia', active: true },
  { code: 'MX', name_en: 'Mexico', name_es: 'México', active: true },
  { code: 'PE', name_en: 'Peru', name_es: 'Perú', active: true },
  { code: 'US', name_en: 'United States', name_es: 'Estados Unidos', active: true },
  { code: 'UY', name_en: 'Uruguay', name_es: 'Uruguay', active: true },
  { code: 'VE', name_en: 'Venezuela', name_es: 'Venezuela', active: true },

  // Asia & Oceania
  { code: 'AU', name_en: 'Australia', name_es: 'Australia', active: true },
  { code: 'CN', name_en: 'China', name_es: 'China', active: true },
  { code: 'IN', name_en: 'India', name_es: 'India', active: true },
  { code: 'JP', name_en: 'Japan', name_es: 'Japón', active: true },
  { code: 'KR', name_en: 'South Korea', name_es: 'Corea del Sur', active: true },
  { code: 'MY', name_en: 'Malaysia', name_es: 'Malasia', active: true },
  { code: 'NZ', name_en: 'New Zealand', name_es: 'Nueva Zelanda', active: true },
  { code: 'PH', name_en: 'Philippines', name_es: 'Filipinas', active: true },
  { code: 'SG', name_en: 'Singapore', name_es: 'Singapur', active: true },
  { code: 'TH', name_en: 'Thailand', name_es: 'Tailandia', active: true },

  // Middle East & Africa
  { code: 'AE', name_en: 'United Arab Emirates', name_es: 'Emiratos Árabes Unidos', active: true },
  { code: 'EG', name_en: 'Egypt', name_es: 'Egipto', active: true },
  { code: 'MA', name_en: 'Morocco', name_es: 'Marruecos', active: true },
  { code: 'SA', name_en: 'Saudi Arabia', name_es: 'Arabia Saudita', active: true },
  { code: 'TN', name_en: 'Tunisia', name_es: 'Túnez', active: true },
  { code: 'ZA', name_en: 'South Africa', name_es: 'Sudáfrica', active: true },
];

/**
 * Fallback adjacency data
 * Maps country codes to their adjacent countries
 */
const FALLBACK_ADJACENCIES = {
  // Europe
  'AD': ['ES', 'FR'],
  'AL': ['GR'],
  'AT': ['DE', 'CZ', 'SK', 'HU', 'SI', 'IT', 'CH'],
  'BE': ['FR', 'DE', 'NL', 'LU'],
  'BG': ['GR', 'RO'],
  'CH': ['FR', 'IT', 'AT', 'DE'],
  'CZ': ['DE', 'PL', 'SK', 'AT'],
  'DE': ['FR', 'CH', 'AT', 'CZ', 'PL', 'NL', 'BE', 'LU', 'DK'],
  'DK': ['DE'],
  'ES': ['FR', 'PT', 'AD'],
  'FI': ['SE', 'NO'],
  'FR': ['ES', 'IT', 'CH', 'DE', 'BE', 'LU', 'AD'],
  'GB': ['IE'],
  'GR': ['AL', 'BG'],
  'HR': ['SI', 'HU'],
  'HU': ['AT', 'SK', 'RO', 'HR', 'SI'],
  'IE': ['GB'],
  'IS': [],
  'IT': ['FR', 'CH', 'AT', 'SI'],
  'LU': ['BE', 'FR', 'DE'],
  'NL': ['DE', 'BE'],
  'NO': ['SE', 'FI'],
  'PL': ['DE', 'CZ', 'SK'],
  'PT': ['ES'],
  'RO': ['BG', 'HU'],
  'SE': ['NO', 'FI', 'DK'],
  'SI': ['IT', 'AT', 'HU', 'HR'],
  'SK': ['CZ', 'PL', 'HU', 'AT'],

  // Americas - Continental borders
  'AR': ['CL', 'BO', 'BR', 'UY'],
  'BO': ['AR', 'BR', 'CL', 'PE'],
  'BR': ['AR', 'BO', 'CO', 'PE', 'UY', 'VE'],
  'CA': ['US'],
  'CL': ['AR', 'BO', 'PE'],
  'CO': ['BR', 'PE', 'VE'],
  'MX': ['US'],
  'PE': ['BO', 'BR', 'CL', 'CO'],
  'US': ['CA', 'MX'],
  'UY': ['AR', 'BR'],
  'VE': ['BR', 'CO'],

  // Asia & Oceania - Major borders
  'AU': [],
  'CN': ['IN'],
  'IN': ['CN'],
  'JP': [],
  'KR': [],
  'MY': ['TH', 'SG'],
  'NZ': [],
  'PH': [],
  'SG': ['MY'],
  'TH': ['MY'],

  // Middle East & Africa
  'AE': ['SA'],
  'EG': ['SA'],
  'MA': ['ES'],  // Via Ceuta/Melilla proximity
  'SA': ['AE', 'EG'],
  'TN': [],
  'ZA': [],
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
  if (!country) return '';
  return language === 'es' ? (country.name_es || country.name_en || country.name) : (country.name_en || country.name);
};

/**
 * Get country name field based on language
 * @param {string} language - 'en' or 'es'
 * @returns {string} - Field name to use ('name_en' or 'name_es')
 */
export const getCountryNameField = (language = 'en') => {
  return language === 'es' ? 'name_es' : 'name_en';
};
