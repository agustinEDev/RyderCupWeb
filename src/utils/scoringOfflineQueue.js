/**
 * Offline Queue for Scoring
 *
 * Stores pending hole scores in localStorage when the user is offline.
 * Scores are queued and processed when connectivity is restored.
 *
 * Storage key: 'rydercup-scoring-queue'
 * Each entry: { matchId, holeNumber, scoreData, timestamp }
 */

const STORAGE_KEY = 'rydercup-scoring-queue';

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
 * If a score for the same match+hole already exists, it is replaced.
 * @param {string} matchId
 * @param {number} holeNumber
 * @param {Object} scoreData - { ownScore, markedPlayerId, markedScore }
 */
export const enqueue = (matchId, holeNumber, scoreData) => {
  const queue = getAll();
  const filtered = queue.filter(
    entry => !(entry.matchId === matchId && entry.holeNumber === holeNumber)
  );
  filtered.push({
    matchId,
    holeNumber,
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
 * Remove a specific entry from the queue by matchId and holeNumber.
 * @param {string} matchId
 * @param {number} holeNumber
 */
export const remove = (matchId, holeNumber) => {
  const queue = getAll();
  const filtered = queue.filter(
    entry => !(entry.matchId === matchId && entry.holeNumber === holeNumber)
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
 * @returns {number}
 */
export const size = () => {
  return getAll().length;
};

/**
 * Get all entries for a specific match.
 * @param {string} matchId
 * @returns {Array}
 */
export const getByMatch = (matchId) => {
  return getAll().filter(entry => entry.matchId === matchId);
};
