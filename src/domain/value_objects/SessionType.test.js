import { describe, it, expect } from 'vitest';
import { SessionType } from './SessionType';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/session_type.py)
const DEL_BACKEND = ['MORNING', 'AFTERNOON', 'EVENING'];

describe('SessionType', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(SessionType)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(SessionType)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(SessionType)).toBe(true);
  });
});
