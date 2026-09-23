// src/infrastructure/mappers/EnvelopeMapper.js

/**
 * Mapper de los sobres (FE #655): de la API a lo que pinta la pantalla.
 *
 * `submitted` y `automatic` viajan por separado a propósito: un sobre que
 * rellenó la aplicación tiene contenido, pero el capitán no entregó nada, y
 * felicitarle por ello sería mentirle.
 */
class EnvelopeMapper {
  /**
   * @param {Object} apiSobre - Un sobre de la API (snake_case)
   * @returns {Object} El sobre en camelCase
   */
  static toEnvelopeDTO(apiSobre) {
    if (!apiSobre) return null;
    return {
      roundId: apiSobre.round_id,
      team: apiSobre.team,
      entries: apiSobre.entries || [],
      submitted: apiSobre.submitted,
      submittedAt: apiSobre.submitted_at ?? null,
      automatic: apiSobre.automatic,
    };
  }

  /**
   * @param {Object} apiData - Respuesta de GET /rounds/{id}/envelopes
   * @returns {Object} Lo que puede ver quien pregunta
   */
  static toEnvelopesViewDTO(apiData) {
    return {
      roundId: apiData.round_id,
      revealed: apiData.revealed,
      teamASubmitted: Boolean(apiData.team_a_submitted),
      teamBSubmitted: Boolean(apiData.team_b_submitted),
      teamAAutomatic: Boolean(apiData.team_a_automatic),
      teamBAutomatic: Boolean(apiData.team_b_automatic),
      mine: EnvelopeMapper.toEnvelopeDTO(apiData.mine),
      rival: EnvelopeMapper.toEnvelopeDTO(apiData.rival),
      rivalSubmitted: Boolean(apiData.rival_submitted),
      matchups: apiData.matchups || [],
    };
  }
}

export default EnvelopeMapper;
