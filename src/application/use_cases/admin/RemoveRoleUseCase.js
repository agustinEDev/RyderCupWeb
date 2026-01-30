/**
 * RemoveRoleUseCase
 * Elimina un rol de un usuario
 *
 * @param {Object} dependencies - Dependencias inyectadas
 * @param {IUserRepository} dependencies.userRepository - Repositorio de usuarios
 */
class RemoveRoleUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso
   * @param {string} userId - ID del usuario
   * @param {string} roleName - Nombre del rol a eliminar: 'ADMIN', 'CREATOR', 'PLAYER'
   * @returns {Promise<void>}
   */
  async execute(userId, roleName) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!roleName) {
      throw new Error('Role name is required');
    }

    const validRoles = ['ADMIN', 'CREATOR', 'PLAYER'];
    if (!validRoles.includes(roleName)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    await this.userRepository.removeRole(userId, roleName);
  }
}

export default RemoveRoleUseCase;
