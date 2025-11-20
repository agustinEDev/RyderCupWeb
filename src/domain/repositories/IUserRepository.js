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
   * @param {Object} securityData - Datos de seguridad (ej. { email, currentPassword, newPassword }).
   * @returns {Promise<import('../entities/User').default>} El objeto User actualizado.
   */
  async updateSecurity(userId, securityData) {
    throw new Error('Method not implemented: updateSecurity');
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