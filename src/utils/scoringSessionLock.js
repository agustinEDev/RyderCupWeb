/**
 * Session Lock for Scoring
 *
 * Prevents the SAME user from having concurrent scoring sessions across tabs.
 * Different users can score simultaneously (each has their own lock key).
 *
 * Storage key is scoped per userId: `rydercup-scoring-session-{userId}`
 * BroadcastChannel messages include userId for filtering.
 *
 * An optional `scope` keeps a second, independent lock for the same user —
 * `rydercup-scoring-session-{userId}-{scope}` — so other single-worker jobs
 * (the background queue drain, FE #551) reuse this owner/heartbeat/stale logic
 * instead of re-implementing it per tab. Messages carry the scope so listeners
 * that only care about the scoring screen can ignore the rest.
 */

const CHANNEL_NAME = 'rydercup-scoring-lock';
const STORAGE_PREFIX = 'rydercup-scoring-session-';
const STALE_SESSION_THRESHOLD_MS = 120000; // 2 minutes

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

const storageKey = (userId, scope = '') => `${STORAGE_PREFIX}${userId}${scope ? `-${scope}` : ''}`;

/**
 * Try to acquire a scoring session lock for a match.
 * @param {string} matchId
 * @param {string} sessionId - Unique identifier for this tab/session
 * @param {string} userId - Current user ID (scopes the lock)
 * @param {string} [scope] - Independent lock name for the same user (see top)
 * @returns {boolean} true if lock acquired, false if another session is active
 */
export const acquire = (matchId, sessionId, userId, scope = '') => {
  if (!userId) return true;
  const existing = getSession(userId, scope);
  if (existing && existing.sessionId !== sessionId) {
    // Check if the existing session is stale (older than 2 minutes)
    if (Date.now() - existing.timestamp < STALE_SESSION_THRESHOLD_MS) {
      return false;
    }
  }

  const session = { matchId, sessionId, userId, scope, timestamp: Date.now() };
  try {
    localStorage.setItem(storageKey(userId, scope), JSON.stringify(session));
  } catch {
    // Fail open if storage unavailable
  }

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
 * @param {string} userId - Current user ID
 * @param {string} [scope]
 */
export const release = (sessionId, userId, scope = '') => {
  if (!userId) return;
  const existing = getSession(userId, scope);
  if (existing && existing.sessionId === sessionId) {
    try {
      localStorage.removeItem(storageKey(userId, scope));
    } catch {
      // Fail open if storage unavailable
    }

    const channel = initChannel();
    if (channel) {
      try {
        channel.postMessage({ type: 'LOCK_RELEASED', sessionId, userId, scope });
      } catch {
        // Silent fail
      }
    }
  }
};

/**
 * Refresh the lock timestamp to prevent staleness.
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} [scope]
 */
export const refresh = (sessionId, userId, scope = '') => {
  if (!userId) return;
  const existing = getSession(userId, scope);
  if (existing && existing.sessionId === sessionId) {
    existing.timestamp = Date.now();
    try {
      localStorage.setItem(storageKey(userId, scope), JSON.stringify(existing));
    } catch {
      // Fail open if storage unavailable
    }
  }
};

/**
 * Get the current session info for a user.
 * @param {string} userId
 * @param {string} [scope]
 * @returns {Object|null} { matchId, sessionId, userId, timestamp } or null
 */
export const getSession = (userId, scope = '') => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, scope));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Listen for lock events from other tabs.
 * @param {Function} callback - Receives { type, matchId, sessionId, userId }
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
 * Force-release any existing lock for a user regardless of session ownership.
 * Used when user explicitly takes over a session.
 * @param {string} userId
 */
export const forceRelease = (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Fail open if storage unavailable
  }

  const channel = initChannel();
  if (channel) {
    try {
      channel.postMessage({ type: 'LOCK_RELEASED', sessionId: 'force', userId });
    } catch {
      // Silent fail
    }
  }
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
