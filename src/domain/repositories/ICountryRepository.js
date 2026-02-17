/* eslint-disable no-unused-vars */
/**
 * Interface for Country Repository
 * Defines the contract for accessing country data
 */
class ICountryRepository {
  /**
   * Get all active countries
   * @returns {Promise<Array<{code: string, name_en: string, name_es: string, active: boolean}>>}
   */
  async findAll() {
    throw new Error('ICountryRepository.findAll must be implemented');
  }

  /**
   * Get countries adjacent to the given country
   * @param {string} countryCode - ISO country code (e.g., 'ES')
   * @returns {Promise<Array<{code: string, name_en: string, name_es: string, active: boolean}>>}
   */
  async findAdjacent(countryCode) {
    throw new Error('ICountryRepository.findAdjacent must be implemented');
  }
}

export default ICountryRepository;
