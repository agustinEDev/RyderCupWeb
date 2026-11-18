import { describe, it, expect } from 'vitest';
import {
  ScoringFormat,
  isValidScoringFormat,
  isFreePlay,
} from './ScoringFormat';

// Los valores, tal cual los manda el backend (shared/domain/value_objects/scoring_format.py)
const DEL_BACKEND = ['MEDAL', 'STABLEFORD'];

describe('ScoringFormat', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(ScoringFormat)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(ScoringFormat)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ScoringFormat)).toBe(true);
  });

  it('isValidScoringFormat acepta cada valor', () => {
    for (const valor of DEL_BACKEND) {
      expect(isValidScoringFormat(valor)).toBe(true);
    }
  });

  it('isValidScoringFormat rechaza lo que no es un valor', () => {
    for (const valor of [
      undefined,
      null,
      '',
      'DESCONOCIDO',
      DEL_BACKEND[0].toLowerCase(),
    ]) {
      expect(isValidScoringFormat(valor)).toBe(false);
    }
  });
});

describe('isFreePlay', () => {
  it('juego libre: la partida tiene formato de puntuación (medal o stableford)', () => {
    expect(isFreePlay(ScoringFormat.MEDAL)).toBe(true);
    expect(isFreePlay(ScoringFormat.STABLEFORD)).toBe(true);
  });

  it('match play: sin formato de puntuación', () => {
    expect(isFreePlay(null)).toBe(false);
    expect(isFreePlay(undefined)).toBe(false);
    expect(isFreePlay('')).toBe(false);
  });

  it('un formato que esta versión no conoce no se trata como juego libre', () => {
    expect(isFreePlay('SKINS')).toBe(false);
  });
});
