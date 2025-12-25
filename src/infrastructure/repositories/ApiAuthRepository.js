/* eslint-disable no-unused-vars */
import IAuthRepository from '../../domain/repositories/IAuthRepository.js';
import User from '../../domain/entities/User.js';
import Email from '../../domain/value_objects/Email'; // Importar Email VO para tipado
import Password from '../../domain/value_objects/Password'; // 1. Importar Password VO
import apiRequest from '../../services/api.js';

class ApiAuthRepository extends IAuthRepository {
  /**
   * @override
   */
  async login(email, password) { // 'email' y 'password' ahora son Value Objects
    try {
      const data = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.getValue(), password: password.getValue() }),
      });

      return {
        user: new User(data.user),
        token: data.access_token,
      };
    } catch (error) {
      // Standardize error message for 401
      if (error.message.includes('401')) {
        throw new Error('Incorrect email or password');
      }
      throw error;
    }
  }

  /**
   * @override
   */
  async register(userData) {
    // Construir el payload con todos los campos
    // Backend acepta country_code como opcional (puede ser null)
    const payload = {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email.getValue(),
      password: userData.password.getValue(),
      country_code: userData.countryCode ? userData.countryCode.value() : null,
    };

    const data = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return new User(data);
  }

  /**
   * @override
   */
  async verifyEmail(token) {
    const data = await apiRequest('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    // La API ahora devuelve { access_token, token_type, user: {...} }
    // Igual que el endpoint de login
    return {
      user: new User(data.user),
      token: data.access_token,
    };
  }
}

export default ApiAuthRepository;
