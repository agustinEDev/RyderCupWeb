class VerifyEmailUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IAuthRepository} dependencies.authRepository - El repositorio de autenticación.
   */
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  /**
   * Ejecuta el caso de uso para verificar el email.
   * @param {string} token - El token de verificación.
   * @returns {Promise<{emailVerified: boolean}>} Verificar no abre sesión (RyderCupAm #753).
   * @throws {Error} Con `errorCode` VERIFICATION_TOKEN_EXPIRED si el enlace caducó.
   */
  async execute(token) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    // Solo verifica: se entra después con la contraseña
    const result = await this.authRepository.verifyEmail(token);

    return result;
  }
}

export default VerifyEmailUseCase;
