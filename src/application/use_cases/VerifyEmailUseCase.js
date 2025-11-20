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
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario con el email verificado.
   */
  async execute(token) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    const updatedUser = await this.authRepository.verifyEmail(token);

    // Podríamos añadir lógica aquí, como actualizar los datos del usuario en secureStorage si ya hay una sesión activa.
    // Por ahora, el componente de la UI lo maneja, pero podría centralizarse aquí.

    return updatedUser;
  }
}

export default VerifyEmailUseCase;
