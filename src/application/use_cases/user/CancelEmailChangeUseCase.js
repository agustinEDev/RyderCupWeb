/**
 * Anula el correo nuevo pendiente (RyderCupAm #749).
 */
class CancelEmailChangeUseCase {
  /**
   * @param {Object} deps
   * @param {import('../../../domain/repositories/IUserRepository').default} deps.userRepository
   */
  constructor({ userRepository }) {
    if (!userRepository) {
      throw new Error('userRepository is required');
    }
    this.userRepository = userRepository;
  }

  /**
   * @returns {Promise<Object>} El usuario, tal como lo devuelve el backend
   */
  async execute() {
    return this.userRepository.cancelEmailChange();
  }
}

export default CancelEmailChangeUseCase;
