/**
 * ListUsersUseCase
 * Lista todos los usuarios del sistema (solo admin)
 *
 * @param {Object} dependencies - Dependencias inyectadas
 * @param {IUserRepository} dependencies.userRepository - Repositorio de usuarios
 */
class ListUsersUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso
   * @returns {Promise<User[]>} Array de usuarios
   */
  async execute() {
    const users = await this.userRepository.list();
    return users;
  }
}

export default ListUsersUseCase;
