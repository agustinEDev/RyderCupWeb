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
   * @returns {Promise<{sesionAbierta: boolean, user?: import('../../../domain/entities/User').default, token?: string}>}
   *   Si el backend abrió sesión (el de antes de RyderCupAm #753) y, entonces, su usuario.
   */
  async execute(token) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    // El backend nuevo solo verifica; el de antes, además, abría sesión
    const result = await this.authRepository.verifyEmail(token);

    return result;
  }
}

export default VerifyEmailUseCase;
