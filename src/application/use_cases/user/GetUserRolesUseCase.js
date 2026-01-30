/**
 * GetUserRolesUseCase
 * Obtiene los roles de un usuario en una competición específica.
 *
 * @param {Object} dependencies - Dependencias inyectadas
 * @param {IUserRepository} dependencies.userRepository - Repositorio de usuarios
 */
class GetUserRolesUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso
   * @param {string} competitionId - ID de la competición
   * @returns {Promise<{isAdmin: boolean, isCreator: boolean, isPlayer: boolean}>}
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const roles = await this.userRepository.getUserRoles(competitionId);

    return {
      isAdmin: roles.is_admin,
      isCreator: roles.is_creator,
      isPlayer: roles.is_player,
    };
  }
}

export default GetUserRolesUseCase;
