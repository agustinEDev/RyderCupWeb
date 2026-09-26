// src/infrastructure/mappers/DraftMapper.js

/**
 * Mapper de la sala de draft (FE #653): de la API a lo que pinta la pantalla.
 *
 * El hándicap llega como texto —la API serializa decimales así— y aquí se
 * convierte a número: ordenar por él como texto pondría «9.0» detrás de «12.0».
 */
/** El número si lo es de verdad, y si no nada: ni «NaN» ni un cero inventado. */
const numeroOnada = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

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
      // Los nombres son lo ÚNICO que hay para pintar la sala: quien entra a
      // mitad de draft no tiene de dónde sacarlos
      teamACaptainName: apiData.team_a_captain_name,
      teamBCaptainName: apiData.team_b_captain_name,
      teamA: apiData.team_a || [],
      teamB: apiData.team_b || [],
      picks: (apiData.picks || []).map(pick => ({
        userId: pick.user_id,
        name: pick.name,
        team: pick.team,
        order: pick.order,
        automatic: pick.automatic,
        // El último entra solo cuando no queda nada que elegir. No es la app
        // eligiendo por un minuto agotado, y un servidor anterior no lo manda
        lastRemaining: pick.last_remaining === true,
      })),
      availablePlayers: (apiData.available_players || []).map(jugador => ({
        userId: jugador.user_id,
        name: jugador.name,
        // Viene de fuera: un valor que no sea un número acabaría pintado tal
        // cual como «NaN» al lado del nombre. Y ausente no es cero: `Number(null)`
        // da 0, que pondría a un jugador sin hándicap el mejor de la lista
        handicap: numeroOnada(jugador.handicap),
      })),
    };
  }
}

export default DraftMapper;
