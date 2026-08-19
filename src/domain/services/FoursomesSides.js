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
  (participantId) => {
    const entry = holeScores.find(
      (hs) => hs.participantId === participantId && hs.holeNumber === holeNumber
    );
    return entry?.score ?? null;
  };

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
