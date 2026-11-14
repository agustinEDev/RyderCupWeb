import IAuthRepository from '../../domain/repositories/IAuthRepository.js';
import User from '../../domain/entities/User.js';
import apiRequest from '../http/api.js';

class ApiAuthRepository extends IAuthRepository {
  /**
   * @override
   */
  async login(email, password) {
    // 'email' y 'password' ahora son Value Objects
    try {
      const data = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.getValue(),
          password: password.getValue(),
        }),
      });

      // Los tokens de sesión van solo en cookies httpOnly (fase 3): del cuerpo solo se
      // lee el csrf_token, que hace falta para POST/PUT/PATCH/DELETE
      return {
        user: new User(data.user),
        csrfToken: data.csrf_token,
      };
    } catch (error) {
      // HTTP 423: demasiados fallos desde esta red para esta cuenta (BE #732). Con su
      // código: el texto, traducido, lo pone la pantalla
      if (error.status === 423 || error.statusCode === 423) {
        const bloqueo = new Error('Too many failed attempts from this network');
        bloqueo.code = 'LOGIN_LOCKED';
        throw bloqueo;
      }

      // HTTP 401: correo o contraseña mal. Con su código: el texto, traducido, lo pone
      // la pantalla (antes salía este mensaje, en inglés, en cualquier idioma)
      if (error.status === 401 || error.statusCode === 401) {
        const credenciales = new Error('Incorrect email or password');
        credenciales.code = 'INVALID_CREDENTIALS';
        throw credenciales;
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
      // Obligatorio y solo `true`: sin él, el backend responde 422 (F1)
      accept_terms: userData.acceptTerms === true,
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

    // Verificar no abre sesión (RyderCupAm #753): solo { message, email_verified }. Ni
    // tokens ni usuario del cuerpo, aunque vinieran (fase 3)
    return { emailVerified: data?.email_verified !== false };
  }

  /**
   * @override
   */
  async resendVerificationLink(token) {
    // Sin sesión y exenta de CSRF: la pantalla del enlace caducado (fase 3)
    await apiRequest('/api/v1/auth/resend-verification-link', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
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
   * @returns {Promise<{valid: boolean, message: string}>} Token validation result.
   *   An invalid or expired token is a 200 with valid:false, not an error (FE #775)
   * @throws {Error} On network or HTTP errors (e.g. 429 from the rate limit)
   */
  async validateResetToken(token) {
    // POST con el token en el cuerpo (fase 3): en la URL acababa en los logs de acceso
    // y del proxy. El GET de antes desaparece en el backend 2.58.0
    const data = await apiRequest('/api/v1/auth/validate-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    // 200 always: `valid` says whether the token is usable
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
  async googleLogin(authorizationCode, codeVerifier) {
    // Sin 423 que traducir: el bloqueo por fallos de contraseña no frena a Google (BE #732)
    // Con el verifier de PKCE: sin él, un código robado se podría canjear (fase 3)
    const data = await apiRequest('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        authorization_code: authorizationCode,
        code_verifier: codeVerifier,
      }),
    });

    return {
      user: new User(data.user),
      csrfToken: data.csrf_token,
      isNewUser: data.is_new_user || false,
    };
  }

  /**
   * @override
   */
  async reauthenticate(password) {
    const data = await apiRequest('/api/v1/auth/reauthenticate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return { expiresIn: data.expires_in };
  }

  /**
   * @override
   */
  async linkGoogleAccount(authorizationCode, codeVerifier) {
    const data = await apiRequest('/api/v1/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({
        authorization_code: authorizationCode,
        code_verifier: codeVerifier,
      }),
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

  /**
   * @override
   */
  async logout() {
    await apiRequest('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
      // Es el cierre: no espera a un cierre pendiente (F-01)
      sinEsperarAlCierre: true,
    });
    return { success: true };
  }

  /**
   * @override
   */
  async resendVerificationEmail(email) {
    const data = await apiRequest('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { message: data.message || 'Verification email sent' };
  }
}

export default ApiAuthRepository;
