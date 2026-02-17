/**
 * Get Adjacent Countries Use Case
 * Retrieves countries adjacent to the given country code
 */
class GetAdjacentCountriesUseCase {
  constructor({ countryRepository }) {
    this.countryRepository = countryRepository;
  }

  async execute(countryCode) {
    if (!countryCode) {
      throw new Error('Country code is required');
    }
    return await this.countryRepository.findAdjacent(countryCode);
  }
}

export default GetAdjacentCountriesUseCase;
