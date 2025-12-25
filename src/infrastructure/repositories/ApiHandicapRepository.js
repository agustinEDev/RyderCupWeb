import IHandicapRepository from '../../domain/repositories/IHandicapRepository.js';
import User from '../../domain/entities/User.js';
import apiRequest from '../../services/api.js';

class ApiHandicapRepository extends IHandicapRepository {
  constructor() {
    super();
    // httpOnly cookies manejan la autenticación automáticamente
  }

  /**
   * @override
   */
  async updateManual(userId, handicap) {
    const payload = {
      user_id: userId,
      handicap: handicap
    };

    const data = await apiRequest('/api/v1/handicaps/update-manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return new User(data);
  }

  /**
   * @override
   */
  async updateFromRfeg(userId) {
    const payload = {
      user_id: userId
    };

    const data = await apiRequest('/api/v1/handicaps/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return new User(data);
  }
}

export default ApiHandicapRepository;
