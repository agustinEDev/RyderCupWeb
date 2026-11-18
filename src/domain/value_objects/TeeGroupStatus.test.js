import { describe, it, expect } from 'vitest';
import TeeGroupStatus from './TeeGroupStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/estado_partida.py (EstadoPartida))
const DEL_BACKEND = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
const POR_JUGAR = ['SCHEDULED', 'IN_PROGRESS'];
const TERMINADOS = ['COMPLETED'];

describe('TeeGroupStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(TeeGroupStatus.getAllValues()).toEqual(DEL_BACKEND);
    for (const valor of DEL_BACKEND) {
      expect(TeeGroupStatus[valor]).toBe(valor);
    }
  });

  it('isValid acepta cada valor y rechaza lo demás', () => {
    for (const valor of DEL_BACKEND) {
      expect(TeeGroupStatus.isValid(valor)).toBe(true);
    }
    for (const valor of [undefined, null, '', 'DESCONOCIDO', 'scheduled']) {
      expect(TeeGroupStatus.isValid(valor)).toBe(false);
    }
  });

  it('el constructor valida y guarda el valor', () => {
    expect(new TeeGroupStatus('IN_PROGRESS').toString()).toBe('IN_PROGRESS');
    expect(() => new TeeGroupStatus('DESCONOCIDO')).toThrow(
      'Invalid TeeGroupStatus: DESCONOCIDO',
    );
  });

  it('equals compara por valor', () => {
    expect(
      new TeeGroupStatus('SCHEDULED').equals(new TeeGroupStatus('SCHEDULED')),
    ).toBe(true);
    expect(
      new TeeGroupStatus('SCHEDULED').equals(new TeeGroupStatus('IN_PROGRESS')),
    ).toBe(false);
    expect(new TeeGroupStatus('SCHEDULED').equals('SCHEDULED')).toBe(false);
  });

  it('por jugar: programado o en juego', () => {
    for (const valor of DEL_BACKEND) {
      const esperado = POR_JUGAR.includes(valor);
      expect(TeeGroupStatus.isPlayable(valor)).toBe(esperado);
      expect(new TeeGroupStatus(valor).isPlayable()).toBe(esperado);
    }
    expect(TeeGroupStatus.isPlayable(undefined)).toBe(false);
    expect(TeeGroupStatus.isPlayable('DESCONOCIDO')).toBe(false);
  });

  it('terminado: COMPLETED', () => {
    for (const valor of DEL_BACKEND) {
      const esperado = TERMINADOS.includes(valor);
      expect(TeeGroupStatus.isFinished(valor)).toBe(esperado);
      expect(new TeeGroupStatus(valor).isFinished()).toBe(esperado);
    }
    expect(TeeGroupStatus.isFinished(undefined)).toBe(false);
    expect(TeeGroupStatus.isFinished('DESCONOCIDO')).toBe(false);
  });
});
