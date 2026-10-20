/**
 * Aceptar la versión vigente de los Términos (auditoría legal, F2 y F3).
 *
 * Mientras no se acepte, el backend responde 403 `TERMS_NOT_ACCEPTED` en las
 * rutas protegidas, incluido guardar el perfil: por eso quien completa el
 * perfil acepta PRIMERO y guarda después.
 */
class AcceptTermsUseCase {
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
   * @returns {Promise<import('../../../domain/entities/User').default>} El usuario, ya con la aceptación
   */
  async execute() {
    return this.userRepository.acceptTerms();
  }
}

export default AcceptTermsUseCase;
