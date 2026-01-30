/**
 * AssignRoleUseCase
 * Asigna un rol a un usuario (ADMIN, CREATOR, PLAYER)
 *
 * @param {Object} dependencies - Dependencias inyectadas
 * @param {IUserRepository} dependencies.userRepository - Repositorio de usuarios
 */
class AssignRoleUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso
   * @param {string} userId - ID del usuario
   * @param {string} roleName - Nombre del rol: 'ADMIN', 'CREATOR', 'PLAYER'
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

    await this.userRepository.assignRole(userId, roleName);
  }
}

export default AssignRoleUseCase;
