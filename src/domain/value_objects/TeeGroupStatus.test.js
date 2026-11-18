import { describe, it, expect } from 'vitest';
import TeeGroupStatus from './TeeGroupStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/estado_partida.py)
const DEL_BACKEND = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
const POR_JUGAR = ['SCHEDULED', 'IN_PROGRESS'];

describe('TeeGroupStatus', () => {
  it('tiene los valores del backend, con la misma grafía', () => {
    for (const valor of DEL_BACKEND) {
      expect(TeeGroupStatus[valor]).toBe(valor);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(TeeGroupStatus)).toBe(true);
  });

  it('por jugar: programada o en el campo', () => {
    for (const valor of DEL_BACKEND) {
      expect(TeeGroupStatus.isPlayable(valor)).toBe(POR_JUGAR.includes(valor));
    }
    expect(TeeGroupStatus.isPlayable(undefined)).toBe(false);
    expect(TeeGroupStatus.isPlayable('DESCONOCIDO')).toBe(false);
  });
});
