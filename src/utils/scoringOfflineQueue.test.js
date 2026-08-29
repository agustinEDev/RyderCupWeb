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

describe('anotaciones por participante (FE #515)', () => {
  beforeEach(() => localStorage.clear());

  it('dos participantes del mismo hoyo no se pisan', () => {
    // En una partida rápida cada participante se envía por separado. Sin el
    // participante en la clave, anotar el segundo borraba el primero
    enqueue('qm-1', 7, { score: 5 }, 'p-1');
    enqueue('qm-1', 7, { score: 4 }, 'p-2');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(2);
    expect(guardadas.map((e) => e.participantId).sort()).toEqual(['p-1', 'p-2']);
  });

  it('reanotar el mismo hoyo del mismo participante reemplaza, no duplica', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1');
    enqueue('qm-1', 7, { score: 6 }, 'p-1');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].scoreData).toEqual({ score: 6 });
  });

  it('quita solo la anotación de ese participante', () => {
    enqueue('qm-1', 7, { score: 5 }, 'p-1');
    enqueue('qm-1', 7, { score: 4 }, 'p-2');

    remove('qm-1', 7, 'p-1');

    const guardadas = getByMatch('qm-1');
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].participantId).toBe('p-2');
  });

  it('guarda la bola recogida, que es una anotación sin número', () => {
    // Un hoyo recogido llega con `score` nulo y significa lo contrario que un
    // hoyo sin anotar, donde no hay entrada ninguna
    enqueue('qm-1', 7, { score: null }, 'p-1');

    const [guardada] = getByMatch('qm-1');
    expect(guardada.scoreData).toEqual({ score: null });
    expect(guardada).toHaveProperty('participantId', 'p-1');
  });

  it('no confunde una anotación de competición con una de partida rápida', () => {
    // Competición no manda participante: su entrada va sin él y no debe
    // borrarse al guardar una de partida rápida del mismo hoyo
    enqueue('m-1', 7, { ownScore: 5 });
    enqueue('m-1', 7, { score: 4 }, 'p-1');

    expect(getByMatch('m-1')).toHaveLength(2);
  });

  it('entiende una cola guardada por una versión anterior', () => {
    // Sin el campo `participantId`: `undefined` cuenta como «de nadie»
    localStorage.setItem(
      'rydercup-scoring-queue',
      JSON.stringify([{ matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, timestamp: 1 }])
    );

    remove('m-1', 7);

    expect(getByMatch('m-1')).toHaveLength(0);
  });
});
