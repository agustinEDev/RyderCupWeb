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
 * el móvil no puede guardar una corrección, lo que sale es lo sustituido de SU
 * hueco, nunca lo del otro marcado.
 */
describe('guardaLaCorreccion · quien marca a dos', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
  });

  const deCarlos = { ownScore: 5, markedPlayerId: 'C', markedScore: 6 };
  const sinSitio = () => almacen.setItem.mockImplementationOnce(() => { throw new Error('QuotaExceededError'); });

  it('sin sitio para la corrección de Dani, sale su marca vieja y lo de Carlos se queda', () => {
    enqueue('m-1', 3, deCarlos, null, 'A');
    enqueue('m-1', 3, { markedPlayerId: 'D', markedScore: 4 }, null, 'A');
    sinSitio();

    const guardado = guardaLaCorreccion('m-1', 3, { markedPlayerId: 'D', markedScore: 5 }, null, 'A', {}, ['markedScore@D']);

    expect(guardado).toBe(false);
    expect(getAll().map((e) => e.scoreData)).toEqual([deCarlos]);
  });

  it('sin sitio para la de Carlos, lo que no se sustituye se queda en SU hueco', () => {
    enqueue('m-1', 3, deCarlos, null, 'A');
    enqueue('m-1', 3, { markedPlayerId: 'D', markedScore: 4 }, null, 'A');
    sinSitio();

    guardaLaCorreccion('m-1', 3, { ...deCarlos, markedScore: 7 }, null, 'A', {}, ['markedScore@C']);

    expect(getAll().map((e) => e.scoreData)).toEqual([
      { markedPlayerId: 'D', markedScore: 4 },
      { ownScore: 5, markedPlayerId: 'C' },
    ]);
  });
});
