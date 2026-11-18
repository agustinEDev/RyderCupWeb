import { describe, it, expect } from 'vitest';
import {
  HandicapUpdateStatus,
  isValidHandicapUpdateStatus,
} from './HandicapUpdateStatus';

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

  it('isValidHandicapUpdateStatus acepta cada valor', () => {
    for (const valor of DEL_BACKEND) {
      expect(isValidHandicapUpdateStatus(valor)).toBe(true);
    }
  });

  it('isValidHandicapUpdateStatus rechaza lo que no es un valor', () => {
    for (const valor of [
      undefined,
      null,
      '',
      'DESCONOCIDO',
      DEL_BACKEND[0].toLowerCase(),
    ]) {
      expect(isValidHandicapUpdateStatus(valor)).toBe(false);
    }
  });
});
