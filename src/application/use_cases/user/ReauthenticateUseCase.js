/**
 * Confirma la contraseña actual antes de vincular Google (RyderCupAm #753). Con solo la
 * sesión, una robada podía añadir un Google que sobrevive a restablecer la contraseña.
 */
class ReauthenticateUseCase {
  /**
   * @param {Object} dependencies
   * @param {import('../../../domain/repositories/IAuthRepository').default} dependencies.authRepository
   */
  constructor({ authRepository }) {
    if (!authRepository) {
      throw new Error('ReauthenticateUseCase requires authRepository');
    }
    this.authRepository = authRepository;
  }

  /**
   * @param {string} password La contraseña actual
   * @returns {Promise<{expiresIn: number}>}
   */
  async execute(password) {
    if (!password) {
      throw new Error('Current password is required');
    }
    return await this.authRepository.reauthenticate(password);
  }
}

export default ReauthenticateUseCase;
