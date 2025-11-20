import IHandicapRepository from '../../domain/repositories/IHandicapRepository.js';
import User from '../../domain/entities/User.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiHandicapRepository extends IHandicapRepository {
  constructor({ authTokenProvider }) {
    super();
    this.authTokenProvider = authTokenProvider;
  }

  /**
   * @override
   */
  async updateManual(userId, handicap) {
    const token = this.authTokenProvider.getToken();
    
    const payload = {
      user_id: userId,
      handicap: handicap
    };

    const response = await fetch(`${API_URL}/api/v1/handicaps/update-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Failed to update handicap manually';
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join('; ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return new User(data);
  }

  /**
   * @override
   */
  async updateFromRfeg(userId) {
    const token = this.authTokenProvider.getToken();
    
    const payload = {
      user_id: userId
    };

    const response = await fetch(`${API_URL}/api/v1/handicaps/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Failed to update handicap from RFEG';
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join('; ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return new User(data);
  }
}

export default ApiHandicapRepository;