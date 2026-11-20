import { describe, it, expect } from 'vitest';
import { QuickMatchMode } from './QuickMatchMode';

// Los valores, tal cual circulan (el asistente de partida rápida)
const DEL_BACKEND = ['MATCH_PLAY', 'FREE_PLAY'];

describe('QuickMatchMode', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(QuickMatchMode)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(QuickMatchMode)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(QuickMatchMode)).toBe(true);
  });
});
