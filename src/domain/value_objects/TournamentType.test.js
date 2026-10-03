import { describe, it, expect } from 'vitest';
import { tieneEquipos } from './TournamentType';

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
