/**
 * Fetch Countries Use Case
 * Retrieves all active countries for competition creation
 */
class FetchCountriesUseCase {
  /**
   * @param {Object} dependencies
   * @param {ICountryRepository} dependencies.countryRepository
   */
  constructor({ countryRepository }) {
    this.countryRepository = countryRepository;
  }

  async execute() {
    return await this.countryRepository.findAll();
  }
}

export default FetchCountriesUseCase;