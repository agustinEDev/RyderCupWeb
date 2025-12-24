/**
 * Fetch Countries Use Case
 * Retrieves all active countries for competition creation
 */

import { getCountries } from '../../services/countries.js';

class FetchCountriesUseCase {
  async execute() {
    return await getCountries();
  }
}

export default FetchCountriesUseCase;