import { describe, it, expect } from 'vitest';
import CardStatus from './CardStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/estado_de_tarjeta.py)
const DEL_BACKEND = ['JUGANDO', 'ENTREGADA', 'RETIRADO', 'NO_PRESENTADO'];

describe('CardStatus', () => {
  it('tiene los valores del backend, con la misma grafía', () => {
    expect(Object.values(CardStatus)).toEqual(DEL_BACKEND);
    for (const valor of DEL_BACKEND) {
      expect(CardStatus[valor]).toBe(valor);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(CardStatus)).toBe(true);
  });
});
