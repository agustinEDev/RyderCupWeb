/**
 * Las reglas de las partidas de una franja que el organizador ve antes de
 * pedir nada (FE #824, PR 6). Son las del backend (RyderCupAm#534), que es
 * quien decide: aquí solo se ofrece lo que va a aceptar.
 *
 * Funciones puras sobre la vista de la franja: `{groups, unassignedPlayers}`,
 * cada partida con `{id, number, teeTime: 'HH:MM', players: [{userId}]}`.
 */

const enLaPartida = (partida, userId) => partida.players.some((p) => p.userId === userId);

/**
 * Adónde puede mover el organizador a un jugador.
 *
 *   - `conSitio`: otras partidas con sitio.
 *   - `intercambios`: en las llenas, con quién se cambia (`{partida, con}`).
 *     Uno sin partida no intercambia: no tiene partida a la que mandar al otro.
 *   - `nueva`: una partida nueva al final, si quedan salidas.
 *
 * El origen nunca se queda con un jugador salvo intercambiando (M2, 9 oct): de
 * una partida de dos solo se intercambia. De una de uno se va a otra con sitio
 * (la suya desaparece), pero no a una nueva al final: sería la misma.
 *
 * @param {{groups: Array, unassignedPlayers: Array}} vista
 * @param {string} userId
 * @param {{tamano: number, salidas: number}} hoja - Jugadores por partida y salidas de la franja
 */
export const destinosDelJugador = (vista, userId, { tamano, salidas }) => {
  const origen = vista.groups.find((g) => enLaPartida(g, userId)) ?? null;
  const otras = vista.groups.filter((g) => g !== origen);
  const quedaria = origen ? origen.players.length - 1 : null;
  const sinQuedarSolo = quedaria !== 1;

  return {
    conSitio: sinQuedarSolo ? otras.filter((g) => g.players.length < tamano) : [],
    intercambios: origen
      ? otras.filter((g) => g.players.length >= tamano).flatMap((g) => g.players.map((con) => ({ partida: g, con })))
      : [],
    nueva: sinQuedarSolo && quedaria !== 0 && vista.groups.length < salidas,
  };
};

/**
 * Por qué no valen los marcadores de una partida, o null si valen (D12).
 *
 * @param {string[]} jugadores - Los de la partida
 * @param {Object<string, string>} marcadores - Quién -> a quién marca
 * @returns {'MISSING'|'SELF'|'UNMARKED'|null}
 */
export const errorDeMarcadores = (jugadores, marcadores) => {
  if (jugadores.some((id) => !marcadores[id])) return 'MISSING';
  if (jugadores.some((id) => marcadores[id] === id)) return 'SELF';
  const marcados = new Set(jugadores.map((id) => marcadores[id]));
  // Cada uno lo marca uno de la partida: si no, alguien se queda sin marcador
  if (jugadores.some((id) => !marcados.has(id))) return 'UNMARKED';
  return null;
};

const minutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Si al mover se vació una partida y las de detrás subieron (11): de cuál a
 * cuál salen antes ahora, y cuántos minutos. Null si ninguna se adelanta.
 *
 * @param {Array} antes - Las partidas de antes
 * @param {Array} despues - Las que contestó el servidor
 * @returns {{desde: number, hasta: number, minutos: number}|null}
 */
export const partidasQueSeAdelantan = (antes, despues) => {
  const horaDe = new Map(antes.map((g) => [g.id, minutos(g.teeTime)]));
  // Llegan por número (el servidor las ordena)
  const adelantadas = despues.filter((g) => horaDe.has(g.id) && minutos(g.teeTime) < horaDe.get(g.id));
  if (adelantadas.length === 0) return null;
  const primera = adelantadas[0];
  return {
    desde: primera.number,
    hasta: adelantadas[adelantadas.length - 1].number,
    minutos: horaDe.get(primera.id) - minutos(primera.teeTime),
  };
};

/**
 * Si todas las franjas se han jugado y cerrado: cada una con partidas, y todas
 * acabadas. Entonces el organizador puede terminar la competición (QA del 11
 * oct 2026: no se veía cómo).
 *
 * @param {Array<{groups: Array<{status: string}>}>} vistas - Las partidas de cada franja
 */
export const todasLasFranjasCerradas = (vistas) =>
  vistas.length > 0 && vistas.every((v) => v.groups.length > 0 && v.groups.every((g) => g.status === 'COMPLETED'));

