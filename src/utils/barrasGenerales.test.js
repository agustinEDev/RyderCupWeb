import { describe, it, expect } from 'vitest';
import { BARRAS_GENERALES } from './barrasGenerales';

describe('BARRAS_GENERALES', () => {
  it('todos los colores menos OTHER, en el orden de TeeColor', () => {
    expect(BARRAS_GENERALES).toEqual([
      'WHITE',
      'YELLOW',
      'BLUE',
      'RED',
      'BLACK',
      'GREEN',
      'ORANGE',
      'PINK',
      'GOLD',
    ]);
  });
});
