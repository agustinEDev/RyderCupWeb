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

  it('isValid acepta cada valor y rechaza lo demás', () => {
    for (const valor of DEL_BACKEND) {
      expect(MatchStatus.isValid(valor)).toBe(true);
    }
    for (const valor of [undefined, null, '', 'DESCONOCIDO', 'scheduled']) {
      expect(MatchStatus.isValid(valor)).toBe(false);
    }
  });

  it('el constructor valida y guarda el valor', () => {
    expect(new MatchStatus('IN_PROGRESS').toString()).toBe('IN_PROGRESS');
    expect(() => new MatchStatus('DESCONOCIDO')).toThrow(
      'Invalid MatchStatus: DESCONOCIDO',
    );
  });

  it('equals compara por valor', () => {
    expect(
      new MatchStatus('SCHEDULED').equals(new MatchStatus('SCHEDULED')),
    ).toBe(true);
    expect(
      new MatchStatus('SCHEDULED').equals(new MatchStatus('IN_PROGRESS')),
    ).toBe(false);
    expect(new MatchStatus('SCHEDULED').equals('SCHEDULED')).toBe(false);
  });

  it('por jugar: programado o en juego', () => {
    for (const valor of DEL_BACKEND) {
      const esperado = POR_JUGAR.includes(valor);
      expect(MatchStatus.isPlayable(valor)).toBe(esperado);
      expect(new MatchStatus(valor).isPlayable()).toBe(esperado);
    }
    expect(MatchStatus.isPlayable(undefined)).toBe(false);
    expect(MatchStatus.isPlayable('DESCONOCIDO')).toBe(false);
  });

  it('terminado: COMPLETED/WALKOVER/CONCEDED', () => {
    for (const valor of DEL_BACKEND) {
      const esperado = TERMINADOS.includes(valor);
      expect(MatchStatus.isFinished(valor)).toBe(esperado);
      expect(new MatchStatus(valor).isFinished()).toBe(esperado);
    }
    expect(MatchStatus.isFinished(undefined)).toBe(false);
    expect(MatchStatus.isFinished('DESCONOCIDO')).toBe(false);
  });
});
