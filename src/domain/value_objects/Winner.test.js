import { describe, it, expect } from 'vitest';
import { Winner } from './Winner';

// Los valores, tal cual los manda el backend (match_play_scoring.py)
const DEL_BACKEND = ['A', 'B', 'HALVED'];

describe('Winner', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(Winner)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(Winner)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(Winner)).toBe(true);
  });
});
