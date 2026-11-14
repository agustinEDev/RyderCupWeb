/** @typedef {import('../value_objects/Email').default} Email */
/** @typedef {import('../value_objects/Password').default} Password */

class IAuthRepository {
  /**
   * Autentica a un usuario.
   * @param {Email} email - El email del usuario como Value Object.
   * @param {Password} password - La contraseña del usuario como Value Object. // <-- CAMBIO AQUÍ
   * @returns {Promise<{user: import('../entities/User').default, csrfToken: string}>} El usuario y el
   *   token CSRF. Los tokens de sesión van solo en cookies httpOnly (fase 3).
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
   * @returns {Promise<{emailVerified: boolean}>} Verificar no abre sesión (RyderCupAm #753).
   * @throws {Error} Con `errorCode` VERIFICATION_TOKEN_EXPIRED si el enlace caducó.
   */
  async verifyEmail(token) {
    throw new Error('Method not implemented: verifyEmail');
  }

  /**
   * Authenticate or register a user via Google OAuth.
   * @param {string} authorizationCode - The authorization code from Google.
   * @param {string} codeVerifier - El verifier de PKCE de la ida (fase 3).
   * @returns {Promise<{user: import('../entities/User').default, csrfToken: string, isNewUser: boolean}>}
   */
  async googleLogin(authorizationCode, codeVerifier) {
    throw new Error('Method not implemented: googleLogin');
  }

  /**
   * Confirma la contraseña actual antes de vincular Google (RyderCupAm #753): deja una
   * marca de 5 minutos en una cookie httpOnly.
   * @param {string} password
   * @returns {Promise<{expiresIn: number}>}
   */
  async reauthenticate(password) {
    throw new Error('Method not implemented: reauthenticate');
  }

  /**
   * Link a Google account to an existing authenticated user.
   * @param {string} authorizationCode - The authorization code from Google.
   * @param {string} codeVerifier - El verifier de PKCE de la ida (fase 3).
   * @returns {Promise<{message: string, provider: string, providerEmail: string}>}
   */
  async linkGoogleAccount(authorizationCode, codeVerifier) {
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

  /**
   * Pide otro enlace de verificación con el caducado, sin sesión (fase 3). La respuesta
   * no dice si se envió.
   * @param {string} token - El token del enlace caducado.
   * @returns {Promise<void>}
   */
  async resendVerificationLink(token) {
    throw new Error('Method not implemented: resendVerificationLink');
  }
}

export default IAuthRepository;
