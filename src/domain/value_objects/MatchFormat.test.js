import { describe, it, expect } from 'vitest';
import {
  MatchFormat,
  isValidMatchFormat,
  isTeamMatchFormat,
} from './MatchFormat';

// Los valores, tal cual los manda el backend (shared/domain/value_objects/match_format.py)
const DEL_BACKEND = ['SINGLES', 'FOURBALL', 'FOURSOMES'];

describe('MatchFormat', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(MatchFormat)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(MatchFormat)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(MatchFormat)).toBe(true);
  });

  it('isValidMatchFormat acepta cada valor', () => {
    for (const valor of DEL_BACKEND) {
      expect(isValidMatchFormat(valor)).toBe(true);
    }
  });

  it('isValidMatchFormat rechaza lo que no es un valor', () => {
    for (const valor of [
      undefined,
      null,
      '',
      'DESCONOCIDO',
      DEL_BACKEND[0].toLowerCase(),
    ]) {
      expect(isValidMatchFormat(valor)).toBe(false);
    }
  });
});

describe('isTeamMatchFormat', () => {
  it('fourball y foursomes se juegan por parejas', () => {
    expect(isTeamMatchFormat(MatchFormat.FOURBALL)).toBe(true);
    expect(isTeamMatchFormat(MatchFormat.FOURSOMES)).toBe(true);
  });

  it('singles no, ni lo que no es un formato', () => {
    expect(isTeamMatchFormat(MatchFormat.SINGLES)).toBe(false);
    expect(isTeamMatchFormat(null)).toBe(false);
    expect(isTeamMatchFormat(undefined)).toBe(false);
    expect(isTeamMatchFormat('fourball')).toBe(false);
  });
});
