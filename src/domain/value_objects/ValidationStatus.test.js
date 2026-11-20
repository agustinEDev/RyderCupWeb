import { describe, it, expect } from 'vitest';
import { ValidationStatus } from './ValidationStatus';

// Los valores, tal cual circulan (en minúsculas: validation_status.py, pasado a minúsculas)
const DEL_BACKEND = ['pending', 'match', 'mismatch'];

describe('ValidationStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(ValidationStatus)).toEqual(DEL_BACKEND);
  });

  it('cada clave es su valor en mayúsculas', () => {
    for (const [clave, valor] of Object.entries(ValidationStatus)) {
      expect(valor.toUpperCase()).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ValidationStatus)).toBe(true);
  });
});
