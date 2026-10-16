import { describe, it, expect } from 'vitest';
import { distanciasDelHoyo } from './distanciasDelHoyo';

// Metros por grado de latitud con el radio que usa distanciaEnMetros
const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
const SALIDA = { lat: 36.28, lon: -5.33 };
const alNorte = (metros) => ({ lat: SALIDA.lat + metros / M_POR_GRADO, lon: SALIDA.lon });
const green = (centro, delante, fondo) => ({ front: alNorte(centro - delante), center: alNorte(centro), back: alNorte(centro + fondo) });

// Agustín, 16 oct: el recuadro es fijo, con los metros oficiales desde la
// salida, y no mira dónde está el jugador
describe('distanciasDelHoyo', () => {
  it('R1: con green dibujado, centro = tarjeta y delante/fondo según lo que mide el green', () => {
    const hoyo = { playLine: [SALIDA, alNorte(300)], green: green(300, 12, 15) };

    expect(distanciasDelHoyo({ metros: 342, hoyo })).toEqual({ front: 330, center: 342, back: 357 });
  });

  it('R2: un hoyo marcado a mano (green a 10 m), ±10', () => {
    const hoyo = { playLine: [SALIDA, alNorte(300)], green: green(300, 10, 10), marcadoPorMi: true };

    expect(distanciasDelHoyo({ metros: 342, hoyo })).toEqual({ front: 332, center: 342, back: 352 });
  });

  it.each([
    ['sin hoyo', null],
    ['con solo la salida', { playLine: [SALIDA], green: null }],
  ])('R3: %s, con la tarjeta: ±10', (_caso, hoyo) => {
    expect(distanciasDelHoyo({ metros: 342, hoyo })).toEqual({ front: 332, center: 342, back: 352 });
  });

  it('R4: sin metros en la tarjeta, medido en el mapa desde la salida siguiendo los codos', () => {
    const hoyo = { playLine: [SALIDA, alNorte(120), alNorte(300)], green: green(300, 12, 15) };

    expect(distanciasDelHoyo({ metros: null, hoyo })).toEqual({ front: 288, center: 300, back: 315 });
  });

  it('R4: siguiendo los codos de verdad (un dogleg mide más que la recta)', () => {
    const codo = { lat: alNorte(150).lat, lon: SALIDA.lon + 0.002 };
    const hoyo = { playLine: [SALIDA, codo, alNorte(300)], green: green(300, 10, 10) };

    expect(distanciasDelHoyo({ metros: null, hoyo }).center).toBeGreaterThan(300);
  });

  it.each([
    ['sin hoyo', null],
    ['sin green', { playLine: [SALIDA, alNorte(300)], green: null }],
    ['sin salida (línea de un punto)', { playLine: [alNorte(300)], green: green(300, 10, 10) }],
  ])('R5: sin metros y %s, no hay recuadro', (_caso, hoyo) => {
    expect(distanciasDelHoyo({ metros: null, hoyo })).toBeNull();
  });

  it.each([0, undefined])('R5: unos metros de %s cuentan como sin metros', (metros) => {
    expect(distanciasDelHoyo({ metros, hoyo: null })).toBeNull();
  });
});
