import { describe, it, expect } from 'vitest';
import { ValidationStatus } from './ValidationStatus';

// Los valores, tal cual circulan por el front: los de validation_status.py del
// backend, que llegan ya en minúsculas en la vista del partido
const EN_EL_FRONT = ['pending', 'match', 'mismatch'];

describe('ValidationStatus', () => {
  it('tiene los valores que circulan por el front, en ese orden y con esa grafía', () => {
    expect(Object.values(ValidationStatus)).toEqual(EN_EL_FRONT);
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
