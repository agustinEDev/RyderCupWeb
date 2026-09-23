// src/domain/repositories/IEnvelopeRepository.js

/**
 * Interfaz del repositorio de sobres (FE #655).
 */

/* eslint-disable no-unused-vars */

class IEnvelopeRepository {
  /**
   * Entrega —o corrige— el sobre del capitan.
   * @param {string} roundId
   * @param {Array<Array<string>>} entries - Las filas, en orden
   * @param {boolean} [revealWhenBothReady] - Pide abrirlos en cuanto esten los dos
   * @returns {Promise<Object>} El sobre tal como queda
   */
  async submitEnvelope(roundId, entries, revealWhenBothReady) {
    throw new Error('Method not implemented');
  }

  /**
   * Lo que puede ver quien pregunta.
   * @param {string} roundId
   * @returns {Promise<Object>}
   */
  async getEnvelopes(roundId) {
    throw new Error('Method not implemented');
  }

  /**
   * Abre los dos sobres y devuelve los enfrentamientos.
   * @param {string} roundId
   * @returns {Promise<Object>}
   */
  async revealEnvelopes(roundId) {
    throw new Error('Method not implemented');
  }

  /**
   * Tira los sobres y los partidos de la sesion para empezar de nuevo.
   * @param {string} roundId
   * @returns {Promise<Object>} Cuantos sobres y partidos se han ido
   */
  async resetEnvelopes(roundId) {
    throw new Error('Method not implemented');
  }

  /**
   * Las sesiones en las que capitaneo y no he entregado el sobre.
   * @returns {Promise<Array<Object>>} De la mas proxima a la mas lejana
   */
  async listMyPendingEnvelopes() {
    throw new Error('Method not implemented');
  }
}

export default IEnvelopeRepository;
