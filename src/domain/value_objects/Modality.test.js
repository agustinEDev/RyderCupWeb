import { describe, it, expect } from 'vitest';
import { Modality } from './Modality';

// Los valores, tal cual los manda el backend (shared/domain/value_objects/modality.py)
const DEL_BACKEND = ['MATCH_PLAY', 'STROKE_PLAY'];

describe('Modality', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(Modality)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(Modality)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(Modality)).toBe(true);
  });
});
