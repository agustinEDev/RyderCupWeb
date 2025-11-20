import IHandicapRepository from '../../domain/repositories/IHandicapRepository.js';

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
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute({ userId, handicap }) {
    if (!userId || handicap === undefined || handicap === null) {
      throw new Error('User ID and handicap value are required');
    }

    // Lógica de negocio: Validar el rango del hándicap.
    // Esta regla pertenece aquí, en la capa de aplicación, porque es una regla
    // de negocio que debe cumplirse sin importar la UI.
    const handicapValue = Number.parseFloat(handicap);
    if (Number.isNaN(handicapValue) || handicapValue < -10 || handicapValue > 54) {
      throw new Error('Invalid handicap value. Must be between -10.0 and 54.0');
    }

    const updatedUser = await this.handicapRepository.updateManual(userId, handicapValue);

    return updatedUser;
  }
}

export default UpdateManualHandicapUseCase;