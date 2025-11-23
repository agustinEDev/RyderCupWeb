import IAuthRepository from '../../domain/repositories/IAuthRepository.js';
import User from '../../domain/entities/User.js';
import Email from '../../domain/value_objects/Email'; // Importar Email VO para tipado
import Password from '../../domain/value_objects/Password'; // 1. Importar Password VO

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiAuthRepository extends IAuthRepository {
  /**
   * @override
   */
  async login(email, password) { // 'email' y 'password' ahora son Value Objects
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.getValue(), password: password.getValue() }), // <-- CAMBIO AQUÍ: Usar password.getValue()
    });

    if (!response.ok) {
      // Intercept 401 Unauthorized specifically to standardize the error message
      if (response.status === 401) {
        throw new Error('Incorrect email or password');
      }

      // Handle other errors (e.g., validation, server errors) as before
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
      user: new User(data.user), // El constructor de User ya sabe cómo manejar el email
      token: data.access_token,
    };
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

    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
    // La API ahora devuelve { access_token, token_type, user: {...} }
    // Igual que el endpoint de login
    return {
      user: new User(data.user),
      token: data.access_token,
    };
  }
}

export default ApiAuthRepository;
