/**
 * Confirma el correo nuevo pendiente con el token de su enlace (RyderCupAm #749).
 */
class ConfirmEmailChangeUseCase {
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
  async execute(token) {
    return this.userRepository.confirmEmailChange(token);
  }
}

export default ConfirmEmailChangeUseCase;
