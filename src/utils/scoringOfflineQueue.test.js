import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueue, dequeue, getAll, remove, clear, size, getByMatch } from './scoringOfflineQueue';

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

describe('scoringOfflineQueue', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add a score to the queue', () => {
      enqueue('m-1', 3, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });

      const queue = getAll();
      expect(queue).toHaveLength(1);
      expect(queue[0].matchId).toBe('m-1');
      expect(queue[0].holeNumber).toBe(3);
      expect(queue[0].scoreData.ownScore).toBe(5);
      expect(queue[0].timestamp).toBeGreaterThan(0);
    });

    it('should replace existing entry for same match+hole', () => {
      enqueue('m-1', 3, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 3, { ownScore: 6, markedPlayerId: 'u2', markedScore: 5 });

      const queue = getAll();
      expect(queue).toHaveLength(1);
      expect(queue[0].scoreData.ownScore).toBe(6);
    });

    it('should keep different holes as separate entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      expect(getAll()).toHaveLength(2);
    });

    it('should keep different matches as separate entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-2', 1, { ownScore: 5, markedPlayerId: 'u3', markedScore: 5 });

      expect(getAll()).toHaveLength(2);
    });
  });

  describe('dequeue', () => {
    it('should return and remove the first entry', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      const entry = dequeue();
      expect(entry.holeNumber).toBe(1);
      expect(getAll()).toHaveLength(1);
    });

    it('should return null when queue is empty', () => {
      expect(dequeue()).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a specific entry', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      remove('m-1', 1);
      const queue = getAll();
      expect(queue).toHaveLength(1);
      expect(queue[0].holeNumber).toBe(2);
    });

    it('should do nothing when entry does not exist', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      remove('m-1', 99);
      expect(getAll()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      clear();
      expect(getAll()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(size()).toBe(0);
    });

    it('should return the number of entries', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-1', 2, { ownScore: 5, markedPlayerId: 'u2', markedScore: 5 });

      expect(size()).toBe(2);
    });
  });

  describe('getAll', () => {
    it('should return empty array when localStorage is empty', () => {
      expect(getAll()).toEqual([]);
    });

    it('should handle corrupt localStorage data', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');
      expect(getAll()).toEqual([]);
    });
  });

  describe('getByMatch', () => {
    it('should return entries for a specific match', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      enqueue('m-2', 1, { ownScore: 5, markedPlayerId: 'u3', markedScore: 5 });
      enqueue('m-1', 2, { ownScore: 3, markedPlayerId: 'u2', markedScore: 3 });

      const entries = getByMatch('m-1');
      expect(entries).toHaveLength(2);
      expect(entries[0].matchId).toBe('m-1');
      expect(entries[1].matchId).toBe('m-1');
    });

    it('should return empty array when no entries for match', () => {
      enqueue('m-1', 1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 4 });
      expect(getByMatch('m-99')).toEqual([]);
    });
  });
});
