/* eslint-disable no-unused-vars */

class IHandicapRepository {
  /**
   * Actualiza manualmente el hándicap de un usuario.
   * @param {string} userId - El ID del usuario.
   * @param {number} handicap - El nuevo valor del hándicap.
   * @returns {Promise<import('../entities/User').default>} El objeto User actualizado con el nuevo hándicap.
   */
  async updateManual(userId, handicap) {
    throw new Error('Method not implemented: updateManual');
  }

  /**
   * Actualiza el hándicap de un usuario consultando a la RFEG.
   * @param {string} userId - El ID del usuario.
   * @returns {Promise<import('../entities/User').default>} El objeto User actualizado con el hándicap de la RFEG.
   */
  async updateFromRfeg(userId) {
    throw new Error('Method not implemented: updateFromRfeg');
  }

  /**
   * Refresca desde la RFEG el hándicap del usuario autenticado, una vez al día
   * y solo si es español (RyderCupAM#340).
   * @returns {Promise<{needsHandicap: boolean, handicap: number|null}>} Si hay
   *   que pedirle el hándicap al jugador, y el que tiene guardado ahora.
   */
  async refreshMine() {
    throw new Error('Method not implemented: refreshMine');
  }
}

export default IHandicapRepository;