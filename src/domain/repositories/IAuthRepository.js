/* eslint-disable no-unused-vars */
import Email from '../value_objects/Email';
import Password from '../value_objects/Password'; // 1. Importar Password VO

class IAuthRepository {
  /**
   * Autentica a un usuario.
   * @param {Email} email - El email del usuario como Value Object.
   * @param {Password} password - La contraseña del usuario como Value Object. // <-- CAMBIO AQUÍ
   * @returns {Promise<{user: import('../entities/User').default, token: string}>} Un objeto con el usuario y el token.
   */
  async login(email, password) {
    throw new Error('Method not implemented: login');
  }

  /**
   * Registra un nuevo usuario.
   * @param {Object} userData - Los datos del nuevo usuario (firstName, lastName, email, password).
   * @param {string} userData.firstName - El nombre del usuario.
   * @param {string} userData.lastName - El apellido del usuario.
   * @param {Email} userData.email - El email del usuario como Value Object.
   * @param {Password} userData.password - La contraseña del usuario como Value Object. // <-- CAMBIO AQUÍ
   * @returns {Promise<import('../entities/User').default>} El objeto User recién creado.
   */
  async register(userData) {
    throw new Error('Method not implemented: register');
  }

  /**
   * Verifica el email de un usuario usando un token.
   * @param {string} token - El token de verificación.
   * @returns {Promise<import('../entities/User').default>} El objeto User con el email verificado.
   */
  async verifyEmail(token) {
    throw new Error('Method not implemented: verifyEmail');
  }

  /**
   * Authenticate or register a user via Google OAuth.
   * @param {string} authorizationCode - The authorization code from Google.
   * @returns {Promise<{user: import('../entities/User').default, csrfToken: string, isNewUser: boolean}>}
   */
  async googleLogin(authorizationCode) {
    throw new Error('Method not implemented: googleLogin');
  }

  /**
   * Link a Google account to an existing authenticated user.
   * @param {string} authorizationCode - The authorization code from Google.
   * @returns {Promise<{message: string, provider: string, providerEmail: string}>}
   */
  async linkGoogleAccount(authorizationCode) {
    throw new Error('Method not implemented: linkGoogleAccount');
  }

  /**
   * Unlink a Google account from an authenticated user.
   * @returns {Promise<{message: string, provider: string}>}
   */
  async unlinkGoogleAccount() {
    throw new Error('Method not implemented: unlinkGoogleAccount');
  }

  /**
   * Logout the current user (invalidate session/cookies).
   * @returns {Promise<{success: boolean}>}
   */
  async logout() {
    throw new Error('Method not implemented: logout');
  }

  /**
   * Resend email verification to the user.
   * @param {string} email - The user's email address.
   * @returns {Promise<{message: string}>}
   */
  async resendVerificationEmail(email) {
    throw new Error('Method not implemented: resendVerificationEmail');
  }
}

export default IAuthRepository;
