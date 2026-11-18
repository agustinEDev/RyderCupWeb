import { describe, it, expect } from 'vitest';
import MatchStatus from './MatchStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/match_status.py)
const DEL_BACKEND = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'WALKOVER',
  'CONCEDED',
];
const POR_JUGAR = ['SCHEDULED', 'IN_PROGRESS'];
const TERMINADOS = ['COMPLETED', 'WALKOVER', 'CONCEDED'];

describe('MatchStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(MatchStatus.getAllValues()).toEqual(DEL_BACKEND);
    for (const valor of DEL_BACKEND) {
      expect(MatchStatus[valor]).toBe(valor);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(MatchStatus)).toBe(true);
  });

  it('por jugar: programado o en juego', () => {
    for (const valor of DEL_BACKEND) {
      expect(MatchStatus.isPlayable(valor)).toBe(POR_JUGAR.includes(valor));
    }
    expect(MatchStatus.isPlayable(undefined)).toBe(false);
    expect(MatchStatus.isPlayable('DESCONOCIDO')).toBe(false);
  });

  it('terminado: COMPLETED, WALKOVER o CONCEDED', () => {
    for (const valor of DEL_BACKEND) {
      expect(MatchStatus.isFinished(valor)).toBe(TERMINADOS.includes(valor));
    }
    expect(MatchStatus.isFinished(undefined)).toBe(false);
    expect(MatchStatus.isFinished('DESCONOCIDO')).toBe(false);
  });
});
