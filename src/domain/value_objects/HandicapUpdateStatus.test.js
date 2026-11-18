import { describe, it, expect } from 'vitest';
import { HandicapUpdateStatus } from './HandicapUpdateStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/entities/actualizacion_de_handicaps.py (EstadoActualizacion))
const DEL_BACKEND = ['IN_PROGRESS', 'COMPLETED', 'INCOMPLETE', 'STOPPED'];

describe('HandicapUpdateStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(HandicapUpdateStatus)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(HandicapUpdateStatus)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(HandicapUpdateStatus)).toBe(true);
  });
});
