class UpdateUserProfileUseCase {
  /**
   * @param {Object} deps - Dependencias
   * @param {import('../../domain/repositories/IUserRepository').default} deps.userRepository - Repositorio de usuarios
   */
  constructor({ userRepository }) {
    if (!userRepository) {
      throw new Error('userRepository is required');
    }
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso.
   * @param {string} userId - El ID del usuario a actualizar.
   * @param {Object} updateData - Los datos a actualizar.
   * @param {string} [updateData.firstName] - El nuevo nombre.
   * @param {string} [updateData.lastName] - El nuevo apellido.
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute(userId, updateData) {
    // 1. Obtener la entidad de usuario actual del repositorio
    const user = await this.userRepository.getById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    // 2. Aplicar los cambios a la entidad
    if (updateData.firstName !== undefined) {
      user.firstName = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      user.lastName = updateData.lastName;
    }
    
    // 3. Persistir la entidad actualizada usando el repositorio
    const updatedUser = await this.userRepository.update(user);

    return updatedUser;
  }
}

export default UpdateUserProfileUseCase;
