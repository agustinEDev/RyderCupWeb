import Email from '../../../domain/value_objects/Email';
import Password from '../../../domain/value_objects/Password';

/** @typedef {import('../../../domain/repositories/IUserRepository').default} IUserRepository */

/**
 * Los datos de seguridad mientras se convierten: llegan como cadenas y cada
 * campo pasa a su value object antes de ir al repositorio.
 * @typedef {Object} DatosDeSeguridadEnCurso
 * @property {string|Password} [current_password]
 * @property {string|Password} [new_password]
 * @property {string|Email} [new_email]
 */

/**
 * Lo que recibe el repositorio: los mismos campos, ya como value objects.
 * @typedef {Object} DatosDeSeguridadConvertidos
 * @property {Password} [current_password]
 * @property {Password} [new_password]
 * @property {Email} [new_email]
 */

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
   * @returns {Promise<import('../../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute({ userId, securityData }) {
    if (!userId || !securityData) {
      throw new Error('User ID and security data are required');
    }

    // Llegan cadenas y al repositorio van sus value objects (Email, Password).
    // Cada campo se lee como cadena justo antes de convertirlo
    /** @type {DatosDeSeguridadEnCurso} */
    const dataToUpdate = { ...securityData };

    // Si existe new_email, convertirlo a Email Value Object
    if (dataToUpdate.new_email) {
      dataToUpdate.new_email = new Email(
        /** @type {string} */ (dataToUpdate.new_email),
      );
    }

    // 2. Si existe current_password, convertirlo a Password Value Object.
    // Sin validar su fortaleza, como en el login: es la que ya tiene, y quien la
    // puso antes de la política actual no podría cambiarla nunca
    if (dataToUpdate.current_password) {
      dataToUpdate.current_password = new Password(
        /** @type {string} */ (dataToUpdate.current_password),
        {
          validateStrength: false,
        },
      );
    }

    // 3. Si existe new_password, convertirlo a Password Value Object
    if (dataToUpdate.new_password) {
      dataToUpdate.new_password = new Password(
        /** @type {string} */ (dataToUpdate.new_password),
      );
    }
    // Nota: El confirm_password se valida en la capa de UI. El VO Password solo valida una contraseña.

    // Aquí cada campo que venía ya es su value object
    const updatedUser = await this.userRepository.updateSecurity(
      userId,
      /** @type {DatosDeSeguridadConvertidos} */ (dataToUpdate),
    );

    return updatedUser;
  }
}

export default UpdateUserSecurityUseCase;
