/**
 * El bando en foursomes: una bola, una tarjeta, una nota por hoyo.
 *
 * En foursomes la pareja juega UNA sola bola, así que en la partida solo hay
 * dos tarjetas. La pantalla de anotación, la tarjeta y la vuelta propia tienen
 * que estar de acuerdo en dos cosas —quién forma cada bando y cuál es la nota
 * del bando en un hoyo—, y cada una lo resolvía por su cuenta: una recorría los
 * participantes y las otras los golpes anotados, así que con dos anotaciones
 * distintas del mismo hoyo podían enseñar números distintos. Las dos reglas
 * viven aquí una sola vez.
 */

/**
 * Agrupa los participantes por bando, en el orden en que vienen.
 *
 * Sin `team` no hay bando al que sumarse y el jugador va solo: meterlos a todos
 * en el mismo grupo convertiría una partida sin ese dato en un bando de cuatro,
 * con una tarjeta única y un total que suma a los rivales.
 *
 * @param {Array<Object>} participants
 * @returns {Array<Array<Object>>} Un array de bandos, cada uno con sus miembros
 */
export const groupParticipantsBySide = (participants = []) => {
  const sides = new Map();

  for (const participant of participants) {
    // `||` y no `??`: el mapper deja pasar un `team` vacío tal cual, y con `??`
    // los cuatro caían en el mismo grupo.
    const key = participant.team || `__solo:${participant.participantId}`;
    if (!sides.has(key)) sides.set(key, []);
    sides.get(key).push(participant);
  }

  return [...sides.values()];
};

/**
 * La nota del bando en un hoyo: la del PRIMER miembro del bando que la tenga.
 *
 * La bola del bando se anota a nombre de su primer jugador, la meta quien la
 * meta, así que en la práctica es siempre esa. El recorrido por los miembros
 * —y no por los golpes anotados, que llegan en el orden del backend— es lo que
 * garantiza que las tres pantallas elijan la misma cuando hay más de una.
 *
 * Una RAYA cuenta como nota del bando: el hoyo está anotado aunque no tenga
 * número, así que la búsqueda para ahí en vez de seguir hasta el compañero.
 * Por eso hace falta `sideEntryOf`, que mira si hay ENTRADA; `sideScoreOf` solo
 * ve el número y no puede distinguir la raya de un hoyo sin anotar.
 *
 * @param {Array<Object>} members Miembros del bando, en orden
 * @param {(participantId: string) => number|null|undefined} scoreOf
 * @returns {number|null}
 */
export const sideScoreOf = (members = [], scoreOf) => {
  for (const member of members) {
    const score = scoreOf(member.participantId);
    if (score != null) return score;
  }
  return null;
};

/**
 * La ANOTACIÓN del bando en un hoyo: la del primer miembro que tenga alguna.
 *
 * Igual que `sideScoreOf`, pero devolviendo la entrada entera en vez del
 * número, que es lo único que permite distinguir un hoyo recogido —entrada con
 * `score` nulo— de uno sin anotar, donde no hay entrada ninguna.
 *
 * @param {Array<Object>} members Miembros del bando, en orden
 * @param {(participantId: string) => Object|null|undefined} entryOf
 * @returns {Object|null}
 */
export const sideEntryOf = (members = [], entryOf) => {
  for (const member of members) {
    const entry = entryOf(member.participantId);
    if (entry) return entry;
  }
  return null;
};

/**
 * Lector de golpes por participante para un hoyo, sobre los golpes anotados.
 *
 * Lo usan la tarjeta y la vuelta propia, que antes llevaban cada una su copia:
 * tenían que seguir siendo idénticas para que los dos números cuadraran.
 *
 * @param {Array<Object>} holeScores
 * @returns {(holeNumber: number) => (participantId: string) => number|null}
 */
export const scoreAtOf =
  (holeScores = []) =>
  (holeNumber) =>
  (participantId) =>
    entryAtOf(holeScores)(holeNumber)(participantId)?.score ?? null;

/**
 * Lector de ANOTACIONES por participante para un hoyo.
 *
 * Devuelve la entrada, no el número: es la única forma de separar el hoyo
 * recogido (entrada con `score` nulo, que sí está jugado) del hoyo sin anotar
 * (sin entrada). Quien solo necesite el número tiene `scoreAtOf`, que se apoya
 * en este para que la regla de búsqueda viva en un sitio.
 *
 * @param {Array<Object>} holeScores
 * @returns {(holeNumber: number) => (participantId: string) => Object|null}
 */
export const entryAtOf =
  (holeScores = []) =>
  (holeNumber) =>
  (participantId) =>
    holeScores.find(
      (hs) => hs.participantId === participantId && hs.holeNumber === holeNumber
    ) ?? null;

/**
 * El participante a cuyo nombre se guarda la bola del bando: el primero.
 *
 * Una bola, una fila. Guardarla a nombre de quien tenga el móvil dejaba dos
 * verdades para el mismo golpe.
 *
 * @param {Array<Object>} members Miembros del bando, en orden
 * @returns {Object|undefined}
 */
export const sideCardHolder = (members = []) => members[0];
