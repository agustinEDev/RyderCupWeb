import { describe, it, expect } from 'vitest';
import { rumbo, orientacionDelHoyo, limitesDelHoyo, esPosicionValida } from './geometriaDelHoyo';

const SALIDA = { lat: 36.28, lon: -5.33 };
const GREEN = {
  front: { lat: 36.2898, lon: -5.332 },
  center: { lat: 36.29, lon: -5.332 },
  back: { lat: 36.2902, lon: -5.332 },
};

describe('rumbo', () => {
  it('hacia el norte 0°, el este 90°, el sur 180° y el oeste 270°', () => {
    const o = { lat: 0, lon: 0 };

    expect(rumbo(o, { lat: 1, lon: 0 })).toBeCloseTo(0, 5);
    expect(rumbo(o, { lat: 0, lon: 1 })).toBeCloseTo(90, 5);
    expect(rumbo(o, { lat: -1, lon: 0 })).toBeCloseTo(180, 5);
    expect(rumbo(o, { lat: 0, lon: -1 })).toBeCloseTo(270, 5);
  });

  it('lejos del ecuador, el rumbo de la esfera (no el del plano)', () => {
    expect(rumbo({ lat: 50, lon: 0 }, { lat: 51, lon: 1 })).toBeCloseTo(32.0747, 3);
  });
});

describe('orientacionDelHoyo (H1: salida abajo, green arriba)', () => {
  it('de la salida al centro del green', () => {
    const hoyo = { playLine: [SALIDA, { lat: 36.285, lon: -5.331 }], green: GREEN };

    expect(orientacionDelHoyo(hoyo)).toBeCloseTo(rumbo(SALIDA, GREEN.center), 6);
  });

  it('sin green, de la salida al final de la línea de juego', () => {
    const fin = { lat: 36.285, lon: -5.331 };

    expect(orientacionDelHoyo({ playLine: [SALIDA, fin], green: null })).toBeCloseTo(rumbo(SALIDA, fin), 6);
  });

  it('S1: sin hoyo, o con un solo punto, sin orientación (norte arriba)', () => {
    expect(orientacionDelHoyo(null)).toBeNull();
    expect(orientacionDelHoyo({ playLine: [SALIDA], green: null })).toBeNull();
    expect(orientacionDelHoyo({ playLine: [], green: GREEN })).toBeNull();
  });
});

describe('limitesDelHoyo (H1/H4: el hoyo entero)', () => {
  it('abarca la línea de juego y el green', () => {
    const hoyo = { playLine: [SALIDA, { lat: 36.285, lon: -5.335 }], green: GREEN };

    expect(limitesDelHoyo(hoyo)).toEqual([
      [-5.335, 36.28],
      [-5.33, 36.2902],
    ]);
  });

  it('sin puntos, sin límites', () => {
    expect(limitesDelHoyo(null)).toBeNull();
    expect(limitesDelHoyo({ playLine: [], green: null })).toBeNull();
  });
});

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
