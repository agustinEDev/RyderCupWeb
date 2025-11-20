import IAuthRepository from '../../domain/repositories/IAuthRepository.js';
import User from '../../domain/entities/User.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiAuthRepository extends IAuthRepository {
  /**
   * @override
   */
  async login(email, password) {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Failed to login';
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
    return {
      user: new User(data.user),
      token: data.access_token,
    };
  }

  /**
   * @override
   */
  async register(userData) {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        password: userData.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Failed to register';
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
  async verifyEmail(token) {
    const response = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Failed to verify email';
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
    // Asumimos que la API devuelve el usuario actualizado
    // Si solo devuelve un mensaje, habría que ajustar el caso de uso
    return new User(data.user);
  }
}

export default ApiAuthRepository;
