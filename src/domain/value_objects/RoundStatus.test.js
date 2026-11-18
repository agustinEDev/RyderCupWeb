import { describe, it, expect } from 'vitest';
import { RoundStatus } from './RoundStatus';

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
});
