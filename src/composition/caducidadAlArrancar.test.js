import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => {
      datos[clave] = String(valor);
    },
    removeItem: (clave) => {
      delete datos[clave];
    },
    clear: () => {
      datos = {};
    },
  };
})();
Object.defineProperty(globalThis, 'localStorage', {
  value: almacen,
  writable: true,
});

const DIA = 24 * 60 * 60 * 1000;

describe('al cargar la app, los avisos caducados salen del móvil (FS-03)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.resetModules();
  });

  it('sin sesión ni red: se borra el de 8 días y se queda el de 1', async () => {
    const ahora = Date.now();
    almacen.setItem(
      'rydercup-golpes-perdidos',
      JSON.stringify([
        {
          matchId: 'viejo',
          holeNumber: 1,
          userId: 'a',
          cuando: ahora - 8 * DIA,
        },
        { matchId: 'nuevo', holeNumber: 1, userId: 'a', cuando: ahora - DIA },
      ]),
    );

    await import('./caducidadAlArrancar');

    const crudo = JSON.parse(almacen.getItem('rydercup-golpes-perdidos'));
    expect(crudo.map((a) => a.matchId)).toEqual(['nuevo']);
  });

  it('con un almacenamiento que falla, la app carga igual', async () => {
    vi.spyOn(almacen, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    await expect(import('./caducidadAlArrancar')).resolves.toBeDefined();
  });

  it('main.jsx lo carga', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.jsx'), 'utf8');
    expect(main).toContain("import './composition/caducidadAlArrancar';");
  });
});
