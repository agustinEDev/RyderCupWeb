class UpdateUserProfileUseCase {
  /**
   * @param {Object} deps - Dependencias
   * @param {import('../../../domain/repositories/IUserRepository').default} deps.userRepository - Repositorio de usuarios
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
   * @param {string} [updateData.countryCode] - El código de país (ISO 3166-1 alpha-2).
   * @returns {Promise<import('../../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute(userId, updateData) {
    if (!userId || !updateData) {
      throw new Error('User ID and update data are required');
    }
    // Directamente llamar al repositorio para actualizar
    // El repositorio se encarga de mapear countryCode al formato de la API
    const updatedUser = await this.userRepository.update(userId, updateData);

    return updatedUser;
  }
}

export default UpdateUserProfileUseCase;
