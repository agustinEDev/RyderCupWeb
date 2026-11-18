import { describe, it, expect } from 'vitest';
import { RoundStatus, isValidRoundStatus } from './RoundStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/round_status.py)
const DEL_BACKEND = [
  'PENDING_TEAMS',
  'PENDING_MATCHES',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
];

describe('RoundStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(RoundStatus)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(RoundStatus)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(RoundStatus)).toBe(true);
  });

  it('isValidRoundStatus acepta cada valor', () => {
    for (const valor of DEL_BACKEND) {
      expect(isValidRoundStatus(valor)).toBe(true);
    }
  });

  it('isValidRoundStatus rechaza lo que no es un valor', () => {
    for (const valor of [
      undefined,
      null,
      '',
      'DESCONOCIDO',
      DEL_BACKEND[0].toLowerCase(),
    ]) {
      expect(isValidRoundStatus(valor)).toBe(false);
    }
  });
});
