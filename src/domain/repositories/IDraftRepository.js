// src/domain/repositories/IDraftRepository.js

/**
 * Interfaz del repositorio de la sala de draft (FE #653).
 *
 * El dominio define el contrato; la infraestructura lo implementa
 * (ApiDraftRepository).
 */

/* eslint-disable no-unused-vars */

class IDraftRepository {
  /**
   * Lanza el sorteo y abre la sala.
   * @param {string} competitionId
   * @returns {Promise<Object>} La sala recien abierta
   */
  async startDraft(competitionId) {
    throw new Error('Method not implemented');
  }

  /**
   * La sala tal como esta, con los turnos agotados ya resueltos.
   * @param {string} competitionId
   * @returns {Promise<Object|null>} La sala, o null si no se ha sorteado
   */
  async getDraft(competitionId) {
    throw new Error('Method not implemented');
  }

  /**
   * Elige a un jugador para el equipo de turno.
   * @param {string} competitionId
   * @param {string} playerId
   * @returns {Promise<Object>} La sala despues de la eleccion
   */
  async makePick(competitionId, playerId) {
    throw new Error('Method not implemented');
  }
}

export default IDraftRepository;
