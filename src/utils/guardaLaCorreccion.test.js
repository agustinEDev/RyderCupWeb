import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guardaLaCorreccion } from './guardaLaCorreccion';
import { enqueue, getAll } from './scoringOfflineQueue';

const almacen = (() => {
  let datos = {};
  return {
    getItem: vi.fn((clave) => datos[clave] ?? null),
    setItem: vi.fn((clave, valor) => { datos[clave] = String(valor); }),
    removeItem: vi.fn((clave) => { delete datos[clave]; }),
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });

/**
 * Quien marca a dos (26 oct 2026): cada marcado tiene su hueco en la cola. Si
 * el móvil no puede guardar la corrección del segundo, lo que sale es lo
 * sustituido de SU hueco, nunca lo del hoyo.
 */
describe('guardaLaCorreccion · quien marca a dos', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
  });

  const delHoyo = { ownScore: 5, markedPlayerId: 'C', markedScore: 6 };

  it('sin sitio para la corrección del segundo, sale su marca vieja y el hoyo se queda', () => {
    enqueue('m-1', 3, delHoyo, null, 'A');
    enqueue('m-1', 3, { markedPlayerId: 'D', markedScore: 4 }, null, 'A', {}, null, 'D');
    almacen.setItem.mockImplementationOnce(() => { throw new Error('QuotaExceededError'); });

    const guardado = guardaLaCorreccion('m-1', 3, { markedPlayerId: 'D', markedScore: 5 }, null, 'A', {}, ['markedScore'], 'D');

    expect(guardado).toBe(false);
    expect(getAll().map((e) => e.scoreData)).toEqual([delHoyo]);
  });

  it('lo que no se sustituye se queda en SU hueco, no en el del hoyo', () => {
    enqueue('m-1', 3, { ownScore: 5 }, null, 'A');
    enqueue('m-1', 3, { ownScore: 7, markedPlayerId: 'D', markedScore: 4 }, null, 'A', {}, null, 'D');
    almacen.setItem.mockImplementationOnce(() => { throw new Error('QuotaExceededError'); });

    guardaLaCorreccion('m-1', 3, { markedPlayerId: 'D', markedScore: 5 }, null, 'A', {}, ['markedScore'], 'D');

    expect(getAll().map((e) => [e.marcado ?? null, e.scoreData])).toEqual([
      [null, { ownScore: 5 }],
      ['D', { ownScore: 7, markedPlayerId: 'D' }],
    ]);
  });

  it('con sitio, la corrección va al hueco del segundo', () => {
    enqueue('m-1', 3, delHoyo, null, 'A');

    guardaLaCorreccion('m-1', 3, { markedPlayerId: 'D', markedScore: 5 }, null, 'A', {}, ['markedScore'], 'D');

    expect(getAll()).toHaveLength(2);
    expect(getAll()[1]).toMatchObject({ marcado: 'D', scoreData: { markedPlayerId: 'D', markedScore: 5 } });
  });
});
