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
import { acquire, release, refresh, isLocked, getSession, onLockEvent, closeChannel } from './scoringSessionLock';

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
      expect(acquire('m-1', 'session-1')).toBe(true);
      const session = getSession();
      expect(session.matchId).toBe('m-1');
      expect(session.sessionId).toBe('session-1');
    });

    it('should acquire lock when same session re-acquires', () => {
      acquire('m-1', 'session-1');
      expect(acquire('m-1', 'session-1')).toBe(true);
    });

    it('should reject lock when another session is active', () => {
      acquire('m-1', 'session-1');
      expect(acquire('m-1', 'session-2')).toBe(false);
    });

    it('should allow lock for different match', () => {
      acquire('m-1', 'session-1');
      expect(acquire('m-2', 'session-2')).toBe(true);
    });

    it('should acquire lock when existing session is stale', () => {
      acquire('m-1', 'session-1');
      // Make the session stale by backdating timestamp
      const session = getSession();
      session.timestamp = Date.now() - 130000; // 2+ minutes ago
      localStorageMock.setItem('rydercup-scoring-session', JSON.stringify(session));

      expect(acquire('m-1', 'session-2')).toBe(true);
    });
  });

  describe('release', () => {
    it('should release the lock when owned by this session', () => {
      acquire('m-1', 'session-1');
      release('session-1');
      expect(getSession()).toBeNull();
    });

    it('should not release lock owned by another session', () => {
      acquire('m-1', 'session-1');
      release('session-2');
      expect(getSession()).not.toBeNull();
    });
  });

  describe('refresh', () => {
    it('should update the timestamp', () => {
      acquire('m-1', 'session-1');
      const before = getSession().timestamp;

      // Advance time slightly
      vi.spyOn(Date, 'now').mockReturnValue(before + 1000);
      refresh('session-1');

      expect(getSession().timestamp).toBe(before + 1000);
      vi.restoreAllMocks();
    });

    it('should not refresh for wrong session', () => {
      acquire('m-1', 'session-1');
      const before = getSession().timestamp;
      refresh('session-2');
      expect(getSession().timestamp).toBe(before);
    });
  });

  describe('isLocked', () => {
    it('should return false when no session', () => {
      expect(isLocked()).toBe(false);
    });

    it('should return true when session is active', () => {
      acquire('m-1', 'session-1');
      expect(isLocked()).toBe(true);
    });

    it('should return false when session is stale', () => {
      acquire('m-1', 'session-1');
      const session = getSession();
      session.timestamp = Date.now() - 130000;
      localStorageMock.setItem('rydercup-scoring-session', JSON.stringify(session));

      expect(isLocked()).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should return null when no session', () => {
      expect(getSession()).toBeNull();
    });

    it('should return session data', () => {
      acquire('m-1', 'session-1');
      const session = getSession();
      expect(session.matchId).toBe('m-1');
      expect(session.sessionId).toBe('session-1');
      expect(typeof session.timestamp).toBe('number');
    });

    it('should handle corrupt localStorage data', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid');
      expect(getSession()).toBeNull();
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
