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

      // v1.13.0: Backend now returns csrf_token for CSRF protection
      return {
        user: new User(data.user),
        token: data.access_token, // Legacy (httpOnly cookie is used)
        csrfToken: data.csrf_token, // NEW: Required for POST/PUT/PATCH/DELETE requests
      };
    } catch (error) {
      // v1.13.0: Handle Account Lockout (HTTP 423)
      if (error.status === 423 || error.statusCode === 423) {
        throw new Error('Account locked due to too many failed login attempts. Please try again after 30 minutes.');
      }

      // Standardize error message for 401
      if (error.status === 401 || error.statusCode === 401) {
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
      gender: userData.gender || null,
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

    // La API ahora devuelve { access_token, token_type, user: {...}, csrf_token }
    // Igual que el endpoint de login
    return {
      user: new User(data.user),
      token: data.access_token,
      csrfToken: data.csrf_token, // v1.13.0: CSRF token for email verification
    };
  }

  /**
   * Request password reset email
   * @override
   * @param {string} email - User email address
   * @returns {Promise<{message: string}>} Success message (always generic for anti-enumeration)
   */
  async requestPasswordReset(email) {
    const data = await apiRequest('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    // Backend always returns 200 OK with generic message (anti-enumeration)
    return {
      message: data.message,
    };
  }

  /**
   * Validate password reset token
   * @override
   * @param {string} token - Reset token from email
   * @returns {Promise<{valid: boolean, message: string}>} Token validation result
   * @throws {Error} If token is invalid or expired (400 Bad Request)
   */
  async validateResetToken(token) {
    const data = await apiRequest(`/api/v1/auth/validate-reset-token/${token}`, {
      method: 'GET',
    });

    // If request succeeds (200 OK), token is valid
    return {
      valid: data.valid,
      message: data.message,
    };
  }

  /**
   * Reset user password with token
   * @override
   * @param {string} token - Reset token from email
   * @param {string} newPassword - New password (already validated by Use Case)
   * @returns {Promise<{message: string}>} Success message
   * @throws {Error} If token is invalid/expired or password doesn't meet requirements
   */
  async resetPassword(token, newPassword) {
    const data = await apiRequest('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    });

    // Backend invalidates all refresh tokens (logout on all devices)
    return {
      message: data.message,
    };
  }
  /**
   * @override
   */
  async googleLogin(authorizationCode) {
    const API_URL = window.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ authorization_code: authorizationCode }),
      });

      // Read text first to avoid body stream double-consume bug
      const text = await response.text();

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch { /* use default */ }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusCode = response.status;
        throw error;
      }

      const data = JSON.parse(text);

      return {
        user: new User(data.user),
        csrfToken: data.csrf_token,
        isNewUser: data.is_new_user || false,
      };
    } catch (error) {
      if (error.status === 423) {
        throw new Error('Account locked due to too many failed login attempts. Please try again after 30 minutes.');
      }
      throw error;
    }
  }

  /**
   * @override
   */
  async linkGoogleAccount(authorizationCode) {
    const data = await apiRequest('/api/v1/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ authorization_code: authorizationCode }),
    });

    return {
      message: data.message,
      provider: data.provider,
      providerEmail: data.provider_email,
    };
  }

  /**
   * @override
   */
  async unlinkGoogleAccount() {
    const data = await apiRequest('/api/v1/auth/google/unlink', {
      method: 'DELETE',
    });

    return {
      message: data.message,
      provider: data.provider,
    };
  }
}

export default ApiAuthRepository;
