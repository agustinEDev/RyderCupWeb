import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage for non-jsdom environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Must import after localStorage mock is set up
import { acquire, release, refresh, getSession, onLockEvent, forceRelease, closeChannel } from './scoringSessionLock';

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('scoringSessionLock', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    closeChannel();
  });

  afterEach(() => {
    closeChannel();
  });

  describe('acquire', () => {
    it('should acquire lock when no session exists', () => {
      expect(acquire('m-1', 'session-1', USER_A)).toBe(true);
      const session = getSession(USER_A);
      expect(session.matchId).toBe('m-1');
      expect(session.sessionId).toBe('session-1');
    });

    it('should acquire lock when same session re-acquires', () => {
      acquire('m-1', 'session-1', USER_A);
      expect(acquire('m-1', 'session-1', USER_A)).toBe(true);
    });

    it('should reject lock when another session of the same user is active', () => {
      acquire('m-1', 'session-1', USER_A);
      expect(acquire('m-1', 'session-2', USER_A)).toBe(false);
    });

    it('should allow different users to score the same match simultaneously', () => {
      acquire('m-1', 'session-1', USER_A);
      expect(acquire('m-1', 'session-2', USER_B)).toBe(true);
    });

    it('should reject lock for different match when another session is active', () => {
      acquire('m-1', 'session-1', USER_A);
      expect(acquire('m-2', 'session-2', USER_A)).toBe(false);
    });

    it('should acquire lock when existing session is stale', () => {
      acquire('m-1', 'session-1', USER_A);
      // Make the session stale by backdating timestamp
      const session = getSession(USER_A);
      session.timestamp = Date.now() - 130000; // 2+ minutes ago
      localStorageMock.setItem('rydercup-scoring-session-user-a', JSON.stringify(session));

      expect(acquire('m-1', 'session-2', USER_A)).toBe(true);
    });

    it('should return true when userId is falsy', () => {
      expect(acquire('m-1', 'session-1', null)).toBe(true);
      expect(acquire('m-1', 'session-1', undefined)).toBe(true);
    });
  });

  describe('release', () => {
    it('should release the lock when owned by this session', () => {
      acquire('m-1', 'session-1', USER_A);
      release('session-1', USER_A);
      expect(getSession(USER_A)).toBeNull();
    });

    it('should not release lock owned by another session', () => {
      acquire('m-1', 'session-1', USER_A);
      release('session-2', USER_A);
      expect(getSession(USER_A)).not.toBeNull();
    });

    it('should not affect another user lock', () => {
      acquire('m-1', 'session-1', USER_A);
      acquire('m-1', 'session-2', USER_B);
      release('session-1', USER_A);
      expect(getSession(USER_A)).toBeNull();
      expect(getSession(USER_B)).not.toBeNull();
    });
  });

  describe('refresh', () => {
    it('should update the timestamp', () => {
      acquire('m-1', 'session-1', USER_A);
      const before = getSession(USER_A).timestamp;

      vi.spyOn(Date, 'now').mockReturnValue(before + 1000);
      refresh('session-1', USER_A);

      expect(getSession(USER_A).timestamp).toBe(before + 1000);
      vi.restoreAllMocks();
    });

    it('should not refresh for wrong session', () => {
      acquire('m-1', 'session-1', USER_A);
      const before = getSession(USER_A).timestamp;
      refresh('session-2', USER_A);
      expect(getSession(USER_A).timestamp).toBe(before);
    });
  });

  describe('getSession', () => {
    it('should return null when no session', () => {
      expect(getSession(USER_A)).toBeNull();
    });

    it('should return session data', () => {
      acquire('m-1', 'session-1', USER_A);
      const session = getSession(USER_A);
      expect(session.matchId).toBe('m-1');
      expect(session.sessionId).toBe('session-1');
      expect(session.userId).toBe(USER_A);
      expect(typeof session.timestamp).toBe('number');
    });

    it('should return null for falsy userId', () => {
      expect(getSession(null)).toBeNull();
      expect(getSession(undefined)).toBeNull();
    });
  });

  describe('forceRelease', () => {
    it('should release lock regardless of session ownership', () => {
      acquire('m-1', 'session-1', USER_A);
      forceRelease(USER_A);
      expect(getSession(USER_A)).toBeNull();
    });

    it('should not affect another user lock', () => {
      acquire('m-1', 'session-1', USER_A);
      acquire('m-1', 'session-2', USER_B);
      forceRelease(USER_A);
      expect(getSession(USER_A)).toBeNull();
      expect(getSession(USER_B)).not.toBeNull();
    });
  });

  describe('onLockEvent', () => {
    it('should return cleanup function even without BroadcastChannel', () => {
      const cleanup = onLockEvent(() => {});
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should return cleanup function for non-function callback', () => {
      const cleanup = onLockEvent(null);
      expect(typeof cleanup).toBe('function');
    });
  });
});
