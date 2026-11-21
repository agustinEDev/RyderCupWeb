import { describe, it, expect } from 'vitest';
import { TournamentType, tieneEquipos } from './TournamentType';

describe('TournamentType · tieneEquipos (FE #791)', () => {
  it('una Ryder Cup tiene equipos', () => {
    expect(tieneEquipos('RYDER_CUP')).toBe(true);
  });

  it('sin tipo, también: es lo que eran todas', () => {
    expect(tieneEquipos(undefined)).toBe(true);
    expect(tieneEquipos(null)).toBe(true);
  });

  it.each(['STABLEFORD', 'MEDAL'])('%s no', (tipo) => {
    expect(tieneEquipos(tipo)).toBe(false);
  });
});

describe('TournamentType', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía (tournament_type.py)', () => {
    expect(Object.values(TournamentType)).toEqual([
      'RYDER_CUP',
      'STABLEFORD',
      'MEDAL',
    ]);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(TournamentType)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(TournamentType)).toBe(true);
  });
});
