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
  userId = null
) => {
  const queue = getAll();
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
 * Con `userId`, solo las de esa persona **y las que no tienen dueño**. Las
 * huérfanas son las que guardó una versión anterior a FE #521, y quedan aquí
 * dentro a propósito: dejarlas fuera de la pantalla de su propia partida sería
 * condenarlas a no enviarse nunca. Quien está mirando esa partida es, casi con
 * seguridad, quien las anotó — y ahí hay contexto para verlo. El vaciado que
 * corre de fondo no las toca, que es donde no hay nadie mirando.
 *
 * @param {string} matchId
 * @param {string|null} [userId]
 * @returns {Array}
 */
export const getByMatch = (matchId, userId) => {
  return getAll().filter((entry) => {
    if (entry.matchId !== matchId) return false;
    if (userId === undefined || userId === null) return true;
    return (entry.userId ?? null) === null || entry.userId === userId;
  });
};

/**
 * Las anotaciones de una persona, sin contar las huérfanas.
 *
 * Es lo que usa el vaciado de fondo: ahí no hay nadie mirando, así que una
 * anotación sin dueño no se manda con la sesión de quien resulte estar dentro
 * (FE #521).
 *
 * @param {string} userId
 * @returns {Array}
 */
export const deQuien = (userId) => {
  if (!userId) return [];
  return getAll().filter((entry) => entry.userId === userId);
};
