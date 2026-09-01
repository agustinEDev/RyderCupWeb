/**
 * Offline Queue for Scoring
 *
 * Stores pending hole scores in localStorage when the user is offline.
 * Scores are queued and processed when connectivity is restored.
 *
 * Storage key: 'rydercup-scoring-queue'
 * Each entry: { matchId, holeNumber, participantId, scoreData, timestamp }
 *
 * `participantId` distingue anotaciones del mismo hoyo en una partida rápida,
 * donde cada participante se envía por separado. En competición no hay tal
 * cosa —una anotación lleva dentro el golpe propio y el del jugador marcado—,
 * así que allí va `null` y todo se comporta como antes (FE #515).
 */

const STORAGE_KEY = 'rydercup-scoring-queue';

/**
 * Si una entrada guardada es la misma anotación que la que se busca.
 *
 * El participante se compara normalizando lo que falta: las entradas escritas
 * antes de FE #515 no tienen el campo, y `undefined` y `null` significan aquí
 * lo mismo —«esta anotación no es de nadie en concreto»—, así que una cola
 * guardada por una versión anterior se sigue entendiendo.
 *
 * **Y el dueño forma parte de la identidad** (FE #521). Sin él, en un móvil
 * compartido la anotación de la segunda persona borraba la de la primera al
 * guardarse: mismo partido, mismo hoyo, luego «la misma». Eran dos golpes de
 * dos personas, y uno desaparecía sin dejar rastro.
 */
const mismaAnotacion = (entry, matchId, holeNumber, participantId, userId) =>
  entry.matchId === matchId
  && entry.holeNumber === holeNumber
  && (entry.participantId ?? null) === (participantId ?? null)
  && (entry.userId ?? null) === (userId ?? null);

/**
 * Get all queued scores from localStorage.
 * @returns {Array} Array of queued score entries
 */
export const getAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Add a score to the offline queue.
 * If a score for the same match+hole+participant already exists, it is replaced.
 * @param {string} matchId
 * @param {number} holeNumber
 * @param {Object} scoreData - { ownScore, markedPlayerId, markedScore }
 * @param {string|null} [participantId] - A quién pertenece la anotación, en las
 *   partidas rápidas. Sin él, dos participantes del mismo hoyo se pisarían
 * @param {string|null} [userId] - De quién es la anotación
 * @param {{matchName?: string|null, matchNumber?: number|null}} [laPartida] -
 *   Cómo se llama la partida, para el aviso del panel. Va en un objeto y no
 *   como dos parámetros más porque ya son cinco por delante
 * @returns {boolean} Si de verdad quedó guardada. Un iPhone sin espacio, o una
 *   ventana privada, rechazan el guardado: quien llame tiene que poder decirlo,
 *   porque callarlo hace desaparecer el golpe sin ningún aviso
 */
const guarda = (cola) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cola));
    return true;
  } catch {
    // Sin espacio, o en una ventana privada. Dejar que suba convertiría esto en
    // un rechazo que nadie recoge dentro del `catch` de quien anota
    return false;
  }
};

export const enqueue = (
  matchId,
  holeNumber,
  scoreData,
  participantId = null,
  userId = null,
  laPartida = {}
) => {
  const { matchName = null, matchNumber = null } = laPartida;
  const queue = getAll();
  const anterior = queue.find(
    entry => mismaAnotacion(entry, matchId, holeNumber, participantId, userId)
  );
  const filtered = queue.filter(
    entry => !mismaAnotacion(entry, matchId, holeNumber, participantId, userId)
  );
  filtered.push({
    matchId,
    holeNumber,
    participantId,
    scoreData,
    timestamp: Date.now(),
    // De quién es esta anotación. Sin esto, en un móvil compartido no hay forma
    // de saber a quién pertenece un golpe guardado, ni de impedir que lo envíe
    // otra persona con SU sesión (FE #521)
    userId,
    // Cómo se llama esta partida, apuntado AL ENCOLAR: el aviso de «tienes
    // golpes sin enviar» tiene que decir de cuál son, y cuando haya que
    // enseñarlo puede no haber cobertura para preguntárselo al servidor. Si
    // quien reencola no lo sabe —al resolver un desacuerdo solo se toca el
    // resultado— se conserva el que ya había
    matchName: matchName ?? anterior?.matchName ?? null,
    // Y con qué número: en una jornada se juegan varios partidos en el MISMO
    // campo, así que solo con el nombre del campo el panel enseña dos avisos
    // idénticos y no se sabe cuál mirar. El número es un dato, no texto: se
    // guarda crudo y lo redacta la traducción, para que quien tenga la
    // aplicación en inglés no lea un rótulo congelado en español
    matchNumber: matchNumber ?? anterior?.matchNumber ?? null,
  });
  return guarda(filtered);
};

/**
 * Remove and return the first entry from the queue.
 * @returns {Object|null} The first queued entry, or null if empty
 */
export const dequeue = () => {
  const queue = getAll();
  if (queue.length === 0) return null;
  const [first, ...rest] = queue;
  if (!guarda(rest)) return null;
  return first;
};

/**
 * Remove a specific entry from the queue.
 * @param {string} matchId
 * @param {number} holeNumber
 * @param {string|null} [participantId]
 * @param {string|null} [userId] - De quién es la anotación que se quiere
 *   quitar. **Es obligatorio en la práctica**: omitirlo NO borra «el hoyo 7 de
 *   quien sea», borra solo la que no tiene dueño, porque `null` es un dueño
 *   más. Quien llame sin él sobre una anotación con dueño no borra nada, y esa
 *   anotación se reenvía en cada reconexión para siempre.
 *
 *   Ojo, porque omitirlo significa lo CONTRARIO que al leer: `getByMatch` sin
 *   dueño devuelve las de todo el mundo, y `remove` sin dueño no toca ninguna
 *   de ellas. Es asimétrico a propósito —leer de más es inofensivo y borrar de
 *   más no lo es— pero se presta a confusión, así que aquí queda dicho.
 * @returns {boolean} Si de verdad quedó guardado el cambio
 */
export const remove = (matchId, holeNumber, participantId = null, userId = null) => {
  const queue = getAll();
  const filtered = queue.filter(
    entry => !mismaAnotacion(entry, matchId, holeNumber, participantId, userId)
  );
  return guarda(filtered);
};

/**
 * Clear all entries from the queue.
 */
export const clear = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que hacer: si no se puede tocar, la cola se queda como esté
  }
};

/**
 * Get the number of queued entries.
 *
 * Con `matchId`, solo las de esa partida. La cola es una sola y la comparten
 * los dos modos de juego, así que contarla entera hacía que una pantalla
 * enseñara «N pendientes» incluyendo anotaciones de otra partida que ella no
 * va a enviar nunca (FE #515).
 *
 * @param {string} [matchId]
 * @returns {number}
 */
export const size = (matchId, userId) => {
  // Por `undefined` y no por veracidad: con una cadena vacía devolvía la cuenta
  // global, que es justo lo que se venía a quitar
  return matchId === undefined ? getAll().length : getByMatch(matchId, userId).length;
};

/**
 * Las anotaciones guardadas de una partida.
 *
 * Con `userId`, solo las de esa persona **y las que no tienen dueño**: ver
 * `esVisiblePara`.
 *
 * @param {string} matchId
 * @param {string|null} [userId]
 * @returns {Array}
 */
export const getByMatch = (matchId, userId) => {
  return getAll().filter((entry) => {
    if (entry.matchId !== matchId) return false;
    if (userId === undefined || userId === null) return true;
    return esVisiblePara(entry, userId);
  });
};

/**
 * Si una anotación guardada le corresponde a quien tiene la sesión abierta.
 *
 * **Las que no llevan dueño cuentan como suyas.** No es un detalle: hasta esta
 * versión la cola no guardaba de quién era nada, así que en el momento de
 * actualizar TODO lo que hay en los móviles es huérfano. Dejarlo fuera hacía
 * que los golpes que esta issue existe para rescatar fueran, justamente, los
 * únicos invisibles: ni se enviaban de fondo ni se enseñaban en el panel, y
 * solo se llegaba a ellos volviendo a abrir esa partida, que es exactamente lo
 * que la issue dice que no pasa.
 *
 * El riesgo que abre —un móvil compartido donde quien entra después manda lo
 * de la persona anterior— está acotado y es temporal: el servidor autoriza por
 * sesión, así que una anotación ajena se rechaza y acaba en un aviso visible
 * en vez de desaparecer en silencio; y en cuanto se anota una vez con esta
 * versión ya no quedan huérfanas. Es la misma regla que
 * `golpesPerdidos.pendientes` aplica a su propio almacén.
 */
const esVisiblePara = (entrada, userId) =>
  (entrada.userId ?? null) === null || entrada.userId === userId;

/**
 * Lo guardado de una persona, agrupado por partida, para el aviso del panel.
 *
 * @param {string|null} [userId]
 * @returns {Array<{matchId: string, matchName: string|null, matchNumber: number|null,
 *   cuantas: number, esPartidaRapida: boolean}>}
 */
export const resumenPorPartida = (userId = null) => {
  const porPartida = new Map();

  for (const entrada of getAll()) {
    // Solo lo de quien está mirando —lo suyo y lo huérfano—: en un móvil
    // compartido, enseñar lo de otra cuenta filtra el nombre de sus partidas
    if (userId != null && !esVisiblePara(entrada, userId)) continue;

    const actual = porPartida.get(entrada.matchId) ?? {
      matchId: entrada.matchId,
      matchName: entrada.matchName ?? null,
      matchNumber: entrada.matchNumber ?? null,
      cuantas: 0,
      // Una anotación con participante es de una partida rápida: allí cada
      // participante se envía por separado
      esPartidaRapida: false,
    };
    actual.cuantas += 1;
    if (entrada.participantId != null) actual.esPartidaRapida = true;
    if (!actual.matchName && entrada.matchName) actual.matchName = entrada.matchName;
    if (actual.matchNumber == null && entrada.matchNumber != null) {
      actual.matchNumber = entrada.matchNumber;
    }
    porPartida.set(entrada.matchId, actual);
  }

  return [...porPartida.values()];
};

/**
 * Las anotaciones que puede enviar quien tiene la sesión abierta.
 *
 * Es lo que usa el vaciado de fondo. Incluye las huérfanas por el motivo que
 * explica `esVisiblePara`: si no, las de todo el parque instalado se quedan
 * sin enviar el día que se actualice.
 *
 * @param {string} userId
 * @returns {Array}
 */
export const deQuien = (userId) => {
  if (!userId) return [];
  return getAll().filter((entry) => esVisiblePara(entry, userId));
};
