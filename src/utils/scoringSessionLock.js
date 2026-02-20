/**
 * Session Lock for Scoring
 *
 * Prevents concurrent scoring sessions across tabs/devices using BroadcastChannel.
 * Only one tab at a time can have an active scoring session for a given match.
 *
 * Pattern reused from broadcastAuth.js (singleton BroadcastChannel).
 */

const CHANNEL_NAME = 'rydercup-scoring-lock';
const STORAGE_KEY = 'rydercup-scoring-session';

const isBroadcastSupported = typeof BroadcastChannel !== 'undefined';

let lockChannel = null;

const initChannel = () => {
  if (!isBroadcastSupported || lockChannel) return lockChannel;
  try {
    lockChannel = new BroadcastChannel(CHANNEL_NAME);
    return lockChannel;
  } catch {
    return null;
  }
};

/**
 * Try to acquire a scoring session lock for a match.
 * @param {string} matchId
 * @param {string} sessionId - Unique identifier for this tab/session
 * @returns {boolean} true if lock acquired, false if another session is active
 */
export const acquire = (matchId, sessionId) => {
  const existing = getSession();
  if (existing && existing.matchId === matchId && existing.sessionId !== sessionId) {
    // Check if the existing session is stale (older than 2 minutes)
    if (Date.now() - existing.timestamp < 120000) {
      return false;
    }
  }

  const session = { matchId, sessionId, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

  // Notify other tabs
  const channel = initChannel();
  if (channel) {
    try {
      channel.postMessage({ type: 'LOCK_ACQUIRED', ...session });
    } catch {
      // Silent fail
    }
  }

  return true;
};

/**
 * Release the scoring session lock.
 * @param {string} sessionId - The session that owns the lock
 */
export const release = (sessionId) => {
  const existing = getSession();
  if (existing && existing.sessionId === sessionId) {
    localStorage.removeItem(STORAGE_KEY);

    const channel = initChannel();
    if (channel) {
      try {
        channel.postMessage({ type: 'LOCK_RELEASED', sessionId });
      } catch {
        // Silent fail
      }
    }
  }
};

/**
 * Refresh the lock timestamp to prevent staleness.
 * @param {string} sessionId
 */
export const refresh = (sessionId) => {
  const existing = getSession();
  if (existing && existing.sessionId === sessionId) {
    existing.timestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
};

/**
 * Check if there is an active session lock.
 * @returns {boolean}
 */
export const isLocked = () => {
  const session = getSession();
  if (!session) return false;
  // Session is considered stale after 2 minutes without refresh
  return Date.now() - session.timestamp < 120000;
};

/**
 * Get the current session info.
 * @returns {Object|null} { matchId, sessionId, timestamp } or null
 */
export const getSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Listen for lock events from other tabs.
 * @param {Function} callback - Receives { type, matchId, sessionId }
 * @returns {Function} Cleanup function
 */
export const onLockEvent = (callback) => {
  const channel = initChannel();
  if (!channel || typeof callback !== 'function') return () => {};

  const handler = (event) => {
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };

  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
};

/**
 * Close the broadcast channel.
 */
export const closeChannel = () => {
  if (lockChannel) {
    try {
      lockChannel.close();
    } catch {
      // Silent fail
    }
    lockChannel = null;
  }
};
