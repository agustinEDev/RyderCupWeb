import { describe, it, expect } from 'vitest';
import { esPosicionValida } from './posicionValida';

describe('esPosicionValida (G4)', () => {
  it('una posición con números de verdad', () => {
    expect(esPosicionValida({ lat: 36.28, lon: -5.33 })).toBe(true);
  });

  it.each([
    ['NaN', { lat: Number.NaN, lon: -5.33 }],
    ['sin longitud', { lat: 36.28 }],
    ['texto', { lat: '36', lon: '-5' }],
    ['latitud en texto', { lat: '36', lon: -5 }],
    ['infinito', { lat: Number.POSITIVE_INFINITY, lon: 0 }],
    ['latitud imposible', { lat: 91, lon: 0 }],
    ['longitud imposible', { lat: 0, lon: 181 }],
    ['nada', null],
  ])('%s → no', (_caso, posicion) => {
    expect(esPosicionValida(posicion)).toBe(false);
  });
});
