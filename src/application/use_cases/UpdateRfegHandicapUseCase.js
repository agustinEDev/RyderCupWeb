import IHandicapRepository from '../../domain/repositories/IHandicapRepository.js';

class UpdateRfegHandicapUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IHandicapRepository} dependencies.handicapRepository - El repositorio de hándicaps.
   */
  constructor({ handicapRepository }) {
    this.handicapRepository = handicapRepository;
  }

  /**
   * Ejecuta el caso de uso para actualizar el hándicap desde la RFEG.
   * @param {Object} params - Parámetros para la actualización.
   * @param {string} params.userId - El ID del usuario.
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario actualizado.
   */
  async execute({ userId }) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Aquí no hay una validación de rango como en el manual,
    // ya que la RFEG se encarga de proporcionar un valor válido.
    // Podría haber otras reglas de negocio, como limitar la frecuencia
    // de las consultas a la RFEG.

    const updatedUser = await this.handicapRepository.updateFromRfeg(userId);

    return updatedUser;
  }
}

export default UpdateRfegHandicapUseCase;