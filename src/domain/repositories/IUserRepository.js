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
   * @param {User} user - El objeto User a actualizar.
   * @returns {Promise<User>} El objeto User actualizado.
   */
  async update(user) {
    throw new Error('Method not implemented: update');
  }

  // Otros métodos que podríamos necesitar:
  // async save(user) {
  //   throw new Error('Method not implemented: save');
  // }
  // async delete(id) {
  //   throw new Error('Method not implemented: delete');
  // }
}

export default UserRepository;