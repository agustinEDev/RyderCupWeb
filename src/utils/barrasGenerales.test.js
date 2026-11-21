import { describe, it, expect } from 'vitest';
import { BARRAS_GENERALES } from './barrasGenerales';

describe('BARRAS_GENERALES', () => {
  it('todos los colores menos OTHER, en el orden de los selectores', () => {
    expect(BARRAS_GENERALES).toEqual([
      'BLACK',
      'WHITE',
      'YELLOW',
      'BLUE',
      'RED',
      'GOLD',
      'GREEN',
      'ORANGE',
      'PINK',
    ]);
  });
});
