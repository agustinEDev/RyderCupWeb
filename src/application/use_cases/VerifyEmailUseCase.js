import IAuthRepository from '../../domain/repositories/IAuthRepository.js';

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
   * @returns {Promise<{user: import('../../domain/entities/User').default, token: string}>} El usuario autenticado y su token JWT.
   */
  async execute(token) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    // La API ahora devuelve { user: User, token: string }
    // Igual que el login - verifica el email Y genera un JWT
    const result = await this.authRepository.verifyEmail(token);

    return result;
  }
}

export default VerifyEmailUseCase;
