import { describe, it, expect } from 'vitest';
import { Visibility } from './Visibility';

// Los valores, tal cual los manda el backend (visibility.py)
const DEL_BACKEND = ['PRIVATE', 'PUBLIC'];

describe('Visibility', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(Visibility)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(Visibility)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(Visibility)).toBe(true);
  });
});
