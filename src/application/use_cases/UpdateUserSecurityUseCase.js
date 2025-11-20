import IUserRepository from '../../domain/repositories/IUserRepository.js';

class UpdateUserSecurityUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IUserRepository} dependencies.userRepository - El repositorio de usuarios.
   */
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso para actualizar la seguridad del usuario.
   * @param {Object} params - Parámetros para la actualización.
   * @param {string} params.userId - El ID del usuario.
   * @param {Object} params.securityData - Los datos de seguridad a actualizar.
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute({ userId, securityData }) {
    if (!userId || !securityData) {
      throw new Error('User ID and security data are required');
    }

    // Aquí podríamos añadir lógica de negocio adicional en el futuro,
    // como validar la fortaleza de la nueva contraseña antes de enviarla,
    // o registrar un evento de dominio.

    const updatedUser = await this.userRepository.updateSecurity(userId, securityData);

    return updatedUser;
  }
}

export default UpdateUserSecurityUseCase;
