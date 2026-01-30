/* eslint-disable no-unused-vars */
import Email from '../value_objects/Email';
import Password from '../value_objects/Password'; // 1. Importar Password VO

class IUserRepository {
  /**
   * Obtiene un usuario por su ID.
   * @param {string} id - El ID del usuario.
   * @returns {Promise<User|null>} El objeto User si se encuentra, o null.
   */
  async getById(id) {
    throw new Error('Method not implemented: getById');
  }

  /**
   * Actualiza la información de un usuario.
   * @param {string} userId - El ID del usuario a actualizar.
   * @param {Object} updateData - Un objeto con los campos a actualizar.
   * @returns {Promise<import('../entities/User').default>} El objeto User actualizado.
   */
  async update(userId, updateData) {
    throw new Error('Method not implemented: update');
  }

  /**
   * Actualiza la información de seguridad de un usuario (ej. email, contraseña).
   * @param {string} userId - El ID del usuario a actualizar.
   * @param {Object} securityData - Datos de seguridad (ej. { current_password?, new_password?, new_email? }).
   * @param {Password} [securityData.current_password] - La contraseña actual como Value Object (opcional).
   * @param {Password} [securityData.new_password] - La nueva contraseña como Value Object (opcional).
   * @param {Email} [securityData.new_email] - El nuevo email como Value Object (opcional).
   * @returns {Promise<import('../entities/User').default>} El objeto User actualizado.
   */
  async updateSecurity(userId, securityData) {
    throw new Error('Method not implemented: updateSecurity');
  }

  /**
   * Obtiene los roles de un usuario en una competición específica.
   * @param {string} competitionId - El ID de la competición.
   * @returns {Promise<{is_admin: boolean, is_creator: boolean, is_player: boolean}>} Objeto con los roles del usuario.
   */
  async getUserRoles(competitionId) {
    throw new Error('Method not implemented: getUserRoles');
  }

  /**
   * Asigna un rol a un usuario.
   * @param {string} userId - El ID del usuario.
   * @param {string} roleName - El nombre del rol ('ADMIN', 'CREATOR', 'PLAYER').
   * @returns {Promise<void>}
   */
  async assignRole(userId, roleName) {
    throw new Error('Method not implemented: assignRole');
  }

  /**
   * Elimina un rol de un usuario.
   * @param {string} userId - El ID del usuario.
   * @param {string} roleName - El nombre del rol a eliminar.
   * @returns {Promise<void>}
   */
  async removeRole(userId, roleName) {
    throw new Error('Method not implemented: removeRole');
  }

  /**
   * Lista todos los usuarios del sistema (solo admin).
   * @returns {Promise<User[]>} Array de usuarios.
   */
  async list() {
    throw new Error('Method not implemented: list');
  }

  // Otros métodos que podríamos necesitar:
  // async save(user) {
  //   throw new Error('Method not implemented: save');
  // }
  // async delete(id) {
  //   throw new Error('Method not implemented: delete');
  // }
}

export default IUserRepository;