import ICountryRepository from '../../domain/repositories/ICountryRepository.js';
import apiRequest from '../http/api.js';
import { segmento } from '../http/api';

class ApiCountryRepository extends ICountryRepository {
  async findAll() {
    return await apiRequest('/api/v1/countries', { method: 'GET' });
  }

  async findAdjacent(countryCode) {
    return await apiRequest(
      `/api/v1/countries/${segmento(countryCode)}/adjacent`,
      { method: 'GET' },
    );
  }
}

export default ApiCountryRepository;
