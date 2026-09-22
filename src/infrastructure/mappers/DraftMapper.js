// src/infrastructure/mappers/DraftMapper.js

/**
 * Mapper de la sala de draft (FE #653): de la API a lo que pinta la pantalla.
 *
 * El hándicap llega como texto —la API serializa decimales así— y aquí se
 * convierte a número: ordenar por él como texto pondría «9.0» detrás de «12.0».
 */
class DraftMapper {
  /**
   * @param {Object} apiData - Respuesta de las rutas de /draft (snake_case)
   * @returns {Object} La sala en camelCase
   */
  static toDraftDTO(apiData) {
    return {
      id: apiData.id,
      competitionId: apiData.competition_id,
      status: apiData.status,
      firstPick: apiData.first_pick ?? null,
      currentTeam: apiData.current_team ?? null,
      turnStartedAt: apiData.turn_started_at ?? null,
      secondsPerTurn: apiData.seconds_per_turn,
      // La hora del servidor: el contador se dibuja contra ella y nunca contra
      // el reloj del móvil, que puede ir descuadrado
      serverTime: apiData.server_time,
      teamACaptainId: apiData.team_a_captain_id,
      teamBCaptainId: apiData.team_b_captain_id,
      teamA: apiData.team_a || [],
      teamB: apiData.team_b || [],
      picks: (apiData.picks || []).map(pick => ({
        userId: pick.user_id,
        team: pick.team,
        order: pick.order,
        automatic: pick.automatic,
      })),
      availablePlayers: (apiData.available_players || []).map(jugador => ({
        userId: jugador.user_id,
        name: jugador.name,
        handicap: jugador.handicap == null ? null : Number(jugador.handicap),
      })),
    };
  }
}

export default DraftMapper;
