class IAuthRepository {
  /**
   * Autentica a un usuario.
   * @param {string} email - El email del usuario.
   * @param {string} password - La contraseña del usuario.
   * @returns {Promise<{user: import('../entities/User').default, token: string}>} Un objeto con el usuario y el token.
   */
  async login(email, password) {
    throw new Error('Method not implemented: login');
  }

  /**
   * Registra un nuevo usuario.
   * @param {Object} userData - Los datos del nuevo usuario (firstName, lastName, email, password).
   * @returns {Promise<import('../entities/User').default>} El objeto User recién creado.
   */
  async register(userData) {
    throw new Error('Method not implemented: register');
  }
}

export default IAuthRepository;
