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
 */
const mismaAnotacion = (entry, matchId, holeNumber, participantId) =>
  entry.matchId === matchId
  && entry.holeNumber === holeNumber
  && (entry.participantId ?? null) === (participantId ?? null);

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
 */
export const enqueue = (matchId, holeNumber, scoreData, participantId = null) => {
  const queue = getAll();
  const filtered = queue.filter(
    entry => !mismaAnotacion(entry, matchId, holeNumber, participantId)
  );
  filtered.push({
    matchId,
    holeNumber,
    participantId,
    scoreData,
    timestamp: Date.now(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * Remove and return the first entry from the queue.
 * @returns {Object|null} The first queued entry, or null if empty
 */
export const dequeue = () => {
  const queue = getAll();
  if (queue.length === 0) return null;
  const [first, ...rest] = queue;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  return first;
};

/**
 * Remove a specific entry from the queue.
 * @param {string} matchId
 * @param {number} holeNumber
 * @param {string|null} [participantId]
 */
export const remove = (matchId, holeNumber, participantId = null) => {
  const queue = getAll();
  const filtered = queue.filter(
    entry => !mismaAnotacion(entry, matchId, holeNumber, participantId)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * Clear all entries from the queue.
 */
export const clear = () => {
  localStorage.removeItem(STORAGE_KEY);
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
export const size = (matchId) => {
  // Por `undefined` y no por veracidad: con una cadena vacía devolvía la cuenta
  // global, que es justo lo que se venía a quitar
  return matchId === undefined ? getAll().length : getByMatch(matchId).length;
};

/**
 * Get all entries for a specific match.
 * @param {string} matchId
 * @returns {Array}
 */
export const getByMatch = (matchId) => {
  return getAll().filter(entry => entry.matchId === matchId);
};
