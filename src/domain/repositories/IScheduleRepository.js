// src/domain/repositories/IScheduleRepository.js

/**
 * Interfaz del repositorio de Schedule (Rondas, Partidos y Equipos).
 *
 * Responsabilidad: Define las operaciones de persistencia para la gestion
 * de rondas, partidos y equipos de una competicion.
 *
 * Principio de Inversion de Dependencia: El dominio define el contrato,
 * la infraestructura lo implementa (ApiScheduleRepository).
 *
 * Implementaciones esperadas:
 * - ApiScheduleRepository: REST API real
 * - MockScheduleRepository: Para tests
 */

/* eslint-disable no-unused-vars */

class IScheduleRepository {
  /**
   * Obtiene el schedule completo de una competicion.
   * Endpoint: GET /api/v1/competitions/{competitionId}/schedule
   *
   * @param {string} competitionId
   * @returns {Promise<Object>} Schedule DTO con rondas y partidos
   * @throws {Error} Si falla la operacion
   */
  async getSchedule(competitionId) {
    throw new Error('Method not implemented');
  }

  /**
   * Configura el schedule de una competicion.
   * Endpoint: POST /api/v1/competitions/{competitionId}/schedule/configure
   *
   * @param {string} competitionId
   * @param {Object} config - Configuracion del schedule
   * @returns {Promise<Object>} Resultado de la configuracion
   * @throws {Error} Si falla la operacion
   */
  async configureSchedule(competitionId, config) {
    throw new Error('Method not implemented');
  }

  /**
   * Asigna equipos a una competicion.
   * Endpoint: POST /api/v1/competitions/{competitionId}/teams
   *
   * @param {string} competitionId
   * @param {Object} teamData - Datos de asignacion de equipos
   * @returns {Promise<Object>} TeamAssignment DTO
   * @throws {Error} Si falla la operacion
   */
  async assignTeams(competitionId, teamData) {
    throw new Error('Method not implemented');
  }

  /**
   * Crea una ronda para una competicion.
   * Endpoint: POST /api/v1/competitions/{competitionId}/rounds
   *
   * @param {string} competitionId
   * @param {Object} roundData - Datos de la ronda
   * @param {string} roundData.golf_course_id
   * @param {string} roundData.date
   * @param {string} roundData.session_type - MORNING | AFTERNOON | EVENING
   * @param {string} roundData.match_format - SINGLES | FOURBALL | FOURSOMES
   * @param {string} [roundData.handicap_mode] - MATCH_PLAY
   * @param {number} [roundData.allowance_percentage]
   * @returns {Promise<Object>} Round DTO
   * @throws {Error} Si falla la operacion
   */
  async createRound(competitionId, roundData) {
    throw new Error('Method not implemented');
  }

  /**
   * Actualiza una ronda existente.
   * Endpoint: PUT /api/v1/rounds/{roundId}
   *
   * @param {string} roundId
   * @param {Object} roundData - Datos actualizados
   * @returns {Promise<Object>} Round DTO actualizado
   * @throws {Error} Si falla la operacion
   */
  async updateRound(roundId, roundData) {
    throw new Error('Method not implemented');
  }

  /**
   * Elimina una ronda.
   * Endpoint: DELETE /api/v1/rounds/{roundId}
   *
   * @param {string} roundId
   * @returns {Promise<void>}
   * @throws {Error} Si falla la operacion
   */
  async deleteRound(roundId) {
    throw new Error('Method not implemented');
  }

  /**
   * Genera partidos para una ronda.
   * Endpoint: POST /api/v1/rounds/{roundId}/matches/generate
   *
   * @param {string} roundId
   * @param {Object} pairings - Emparejamientos opcionales
   * @returns {Promise<Object>} Resultado de generacion de partidos
   * @throws {Error} Si falla la operacion
   */
  async generateMatches(roundId, pairings) {
    throw new Error('Method not implemented');
  }

  /**
   * Obtiene detalle de un partido.
   * Endpoint: GET /api/v1/matches/{matchId}
   *
   * @param {string} matchId
   * @returns {Promise<Object>} Match DTO
   * @throws {Error} Si falla la operacion
   */
  async getMatchDetail(matchId) {
    throw new Error('Method not implemented');
  }

  /**
   * Actualiza el estado de un partido.
   * Endpoint: PUT /api/v1/matches/{matchId}/status
   *
   * @param {string} matchId
   * @param {string} action - Accion a realizar (start, complete, etc.)
   * @param {Object} [result] - Resultado del partido (para complete)
   * @returns {Promise<Object>} Resultado de la actualizacion
   * @throws {Error} Si falla la operacion
   */
  async updateMatchStatus(matchId, action, result) {
    throw new Error('Method not implemented');
  }

  /**
   * Declara walkover para un partido.
   * Endpoint: POST /api/v1/matches/{matchId}/walkover
   *
   * @param {string} matchId
   * @param {string} winningTeam - 'A' o 'B'
   * @param {string} reason - Motivo del walkover
   * @returns {Promise<Object>} Resultado del walkover
   * @throws {Error} Si falla la operacion
   */
  async declareWalkover(matchId, winningTeam, reason) {
    throw new Error('Method not implemented');
  }

  /**
   * Reasigna jugadores de un partido.
   * Endpoint: PUT /api/v1/matches/{matchId}/players
   *
   * @param {string} matchId
   * @param {string[]} teamAIds - IDs de jugadores equipo A
   * @param {string[]} teamBIds - IDs de jugadores equipo B
   * @returns {Promise<Object>} Resultado de la reasignacion
   * @throws {Error} Si falla la operacion
   */
  async reassignPlayers(matchId, teamAIds, teamBIds) {
    throw new Error('Method not implemented');
  }
}

export default IScheduleRepository;
