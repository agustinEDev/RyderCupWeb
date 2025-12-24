class UpdateManualHandicapUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IHandicapRepository} dependencies.handicapRepository - El repositorio de hándicaps.
   */
  constructor({ handicapRepository }) {
    this.handicapRepository = handicapRepository;
  }

  /**
   * Ejecuta el caso de uso para actualizar manualmente el hándicap.
   * @param {Object} params - Parámetros para la actualización.
   * @param {string} params.userId - El ID del usuario.
   * @param {number} params.handicap - El valor del hándicap.
   * @returns {Promise<import('../../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute(params = {}) {
    const { userId, handicap } = params;

    if (!userId || handicap === undefined || handicap === null) {
      throw new Error('User ID and handicap value are required');
    }

    // Convert to number and validate it's a finite number.
    // This rejects non-pure-numeric strings like "10a".
    const handicapValue = Number(handicap);
    if (!Number.isFinite(handicapValue)) {
      throw new Error('Invalid handicap value. Must be a valid number.');
    }

    // Business logic: Validate handicap range.
    if (handicapValue < -10 || handicapValue > 54) {
      throw new Error('Invalid handicap value. Must be between -10.0 and 54.0');
    }

    const updatedUser = await this.handicapRepository.updateManual(userId, handicapValue);

    return updatedUser;
  }
}

export default UpdateManualHandicapUseCase;