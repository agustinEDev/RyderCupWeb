import IUserRepository from '../../domain/repositories/IUserRepository.js';
import Email from '../../domain/value_objects/Email';
import Password from '../../domain/value_objects/Password'; // 1. Importar Password VO

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
   * @param {string} [params.securityData.current_password] - La contraseña actual del usuario (cadena de texto).
   * @param {string} [params.securityData.new_password] - La nueva contraseña (cadena de texto).
   * @param {string} [params.securityData.new_email] - El nuevo email del usuario (cadena de texto).
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute({ userId, securityData }) {
    if (!userId || !securityData) {
      throw new Error('User ID and security data are required');
    }

    const dataToUpdate = { ...securityData };

    // Si existe new_email, convertirlo a Email Value Object
    if (dataToUpdate.new_email) {
      dataToUpdate.new_email = new Email(dataToUpdate.new_email);
    }

    // 2. Si existe current_password, convertirlo a Password Value Object
    if (dataToUpdate.current_password) {
      dataToUpdate.current_password = new Password(dataToUpdate.current_password);
    }

    // 3. Si existe new_password, convertirlo a Password Value Object
    if (dataToUpdate.new_password) {
      dataToUpdate.new_password = new Password(dataToUpdate.new_password);
    }
    // Nota: El confirm_password se valida en la capa de UI. El VO Password solo valida una contraseña.

    const updatedUser = await this.userRepository.updateSecurity(userId, dataToUpdate);

    return updatedUser;
  }
}

export default UpdateUserSecurityUseCase;
