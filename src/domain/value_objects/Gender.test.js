import { describe, it, expect } from 'vitest';
import { Gender } from './Gender';

// Los valores, tal cual los manda el backend (gender.py)
const DEL_BACKEND = ['MALE', 'FEMALE'];

describe('Gender', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(Gender)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(Gender)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(Gender)).toBe(true);
  });
});
