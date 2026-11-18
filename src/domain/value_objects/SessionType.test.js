import { describe, it, expect } from 'vitest';
import { SessionType, isValidSessionType } from './SessionType';

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

  it('isValidSessionType acepta cada valor', () => {
    for (const valor of DEL_BACKEND) {
      expect(isValidSessionType(valor)).toBe(true);
    }
  });

  it('isValidSessionType rechaza lo que no es un valor', () => {
    for (const valor of [
      undefined,
      null,
      '',
      'DESCONOCIDO',
      DEL_BACKEND[0].toLowerCase(),
    ]) {
      expect(isValidSessionType(valor)).toBe(false);
    }
  });
});
