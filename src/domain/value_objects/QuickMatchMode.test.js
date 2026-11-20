import { describe, it, expect } from 'vitest';
import { QuickMatchMode } from './QuickMatchMode';

// Los valores del asistente de partida rápida: estado de la interfaz, no del
// backend
const EN_EL_FRONT = ['MATCH_PLAY', 'FREE_PLAY'];

describe('QuickMatchMode', () => {
  it('tiene los valores que circulan por el front, en ese orden y con esa grafía', () => {
    expect(Object.values(QuickMatchMode)).toEqual(EN_EL_FRONT);
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
