/**
 * Las reglas de las partidas de una franja que el organizador ve antes de
 * pedir nada (FE #824, PR 6). Son las del backend (RyderCupAm#534), que es
 * quien decide: aquí solo se ofrece lo que va a aceptar.
 *
 * Funciones puras sobre la vista de la franja: `{groups, unassignedPlayers}`,
 * cada partida con `{id, number, teeTime: 'HH:MM', players: [{userId}]}`.
 */

const enLaPartida = (partida, userId) => partida.players.some((p) => p.userId === userId);

// Un no presentado sigue en su partida (su NP sale en la clasificación), pero
// no ocupa sitio, no se mueve y no es compañero de nadie (RyderCupAm#543)
export const esNoPresentado = (jugador) => jugador?.cardStatus === 'NO_PRESENTADO';

/** Los de la partida que juegan: sin los no presentados. */
export const juegan = (partida) => partida.players.filter((p) => !esNoPresentado(p));

/**
 * Si anota en esa partida: está en ella y su tarjeta sigue abierta. Con la
 * tarjeta cerrada (entregada, retirado, no presentado) solo la ve (QA 3).
 */
export const anotaSuTarjeta = (partida, userId) => {
  const yo = partida.players.find((p) => p.userId === userId);
  // Ni en una partida ya cerrada, aunque su tarjeta quedara abierta (/code-review)
  return Boolean(yo) && (yo.cardStatus ?? 'JUGANDO') === 'JUGANDO' && partida.status !== 'COMPLETED';
};

/** Con quién juega: sin él ni los no presentados. */
export const companerosDe = (partida, userId) => juegan(partida).filter((p) => p.userId !== userId);

/**
 * Se retiró: sigue siendo de la partida, y se dice al nombrarlo —«Con Bea
 * (retirada)»— en vez de esconderlo, que dejaba «de momento sin compañeros»
 * junto a «marcas a Bea» (QA de la release, 14 oct).
 */
export const seRetiro = (jugador) => jugador?.cardStatus === 'RETIRADO';

/** Si una partida aún se puede tocar: no ha salido (#544). Sin el campo, sí. */
export const seCambia = (partida) => partida.canChange !== false;

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
 * Con la franja empezada (#544), solo cuentan las que no han salido
 * (`canChange`), y una nueva solo si el servidor dice que cabe (`canAddGroup`).
 * Sin esos campos (un backend de antes), todas.
 *
 * @param {{groups: Array, unassignedPlayers: Array, canAddGroup?: boolean}} vista
 * @param {string} userId
 * @param {{tamano: number, salidas: number}} hoja - Jugadores por partida y salidas de la franja
 */
export const destinosDelJugador = (vista, userId, { tamano, salidas }) => {
  const origen = vista.groups.find((g) => enLaPartida(g, userId)) ?? null;
  const sinDestinos = { conSitio: [], intercambios: [], nueva: false };
  if (esNoPresentado(origen?.players.find((p) => p.userId === userId))) return sinDestinos;
  if (origen && !seCambia(origen)) return sinDestinos;
  const otras = vista.groups.filter((g) => g !== origen && seCambia(g));
  // Solo cuentan los que juegan: dejar a uno solo junto a no presentados
  // tampoco vale, y dejar solo no presentados sí (12 oct 2026)
  const sinQuedarSolo = !origen || juegan(origen).length - 1 !== 1;
  const unoDeVarios = origen ? origen.players.length > 1 : true;

  return {
    // A una solo de no presentados también: queda incompleta hasta que el
    // organizador traiga a otro, como una nueva (M1; decidido el 12 oct 2026)
    conSitio: sinQuedarSolo ? otras.filter((g) => juegan(g).length < tamano) : [],
    intercambios: origen
      ? otras.filter((g) => juegan(g).length >= tamano).flatMap((g) => juegan(g).map((con) => ({ partida: g, con })))
      : [],
    nueva: sinQuedarSolo && unoDeVarios && vista.canAddGroup !== false && vista.groups.length < salidas,
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

/**
 * Si quien juega no tiene a nadie en juego que le marque: nadie, o su marcador
 * ya entregó. Sus hoyos los valida entonces el organizador, de una vez (BE
 * #539; la regla, aquí una vez: la usan su pantalla y las tarjetas).
 *
 * @param {Array<{userId: string, cardStatus: string, markedByUserId: string|null}>} tarjetas
 * @param {string} jugador
 */
export const sinMarcadorEnJuego = (tarjetas, jugador) => {
  const estadoDe = (id) => tarjetas.find((c) => c.userId === id)?.cardStatus;
  const suya = tarjetas.find((c) => c.userId === jugador);
  return suya?.cardStatus === 'JUGANDO' && (!suya.markedByUserId || estadoDe(suya.markedByUserId) !== 'JUGANDO');
};

