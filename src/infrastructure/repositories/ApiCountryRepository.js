import ICountryRepository from '../../domain/repositories/ICountryRepository.js';
import apiRequest from '../../services/api.js';

class ApiCountryRepository extends ICountryRepository {
  async findAll() {
    return await apiRequest('/api/v1/countries', { method: 'GET' });
  }

  async findAdjacent(countryCode) {
    return await apiRequest(`/api/v1/countries/${countryCode}/adjacent`, { method: 'GET' });
  }
}

export default ApiCountryRepository;
