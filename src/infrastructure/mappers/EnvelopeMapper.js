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
      // Si ese capitán pidió abrirlos en cuanto estén los dos
      revealWhenBothReady: Boolean(apiSobre.reveal_when_both_ready),
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
      rivalWantsEarly: Boolean(apiData.rival_wants_early),
      // El plazo: a esa hora se abren solos y lo que falte lo rellena la app
      revealScheduledAt: apiData.reveal_scheduled_at ?? null,
      // Quién puede abrirlos lo decide el servidor: la regla —hacen falta los
      // dos sobres dentro, sea quien sea— vive en un sitio
      canReveal: Boolean(apiData.can_reveal),
      // 1 en individuales, 2 en los formatos de parejas. Lo dice el servidor
      // para que la pantalla no repita qué formatos son de parejas
      playersPerRow: Number(apiData.players_per_row) || 1,
      matchups: apiData.matchups || [],
      // Los nombres son TODO lo que la pantalla tiene: de un UUID no sale
      // ninguno, y sin ellos el capitán ni siquiera ve su propia lista
      myPlayers: (apiData.my_players || []).map((jugador) => ({
        userId: jugador.user_id,
        name: jugador.name,
        handicap: jugador.handicap == null ? null : Number(jugador.handicap),
      })),
      playerNames: apiData.player_names || {},
    };
  }
}

export default EnvelopeMapper;
