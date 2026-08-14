/**
 * Tests del redondeo de coordenadas (FE #385)
 *
 * Lo que se vigila es que la precision de casa no pueda volver a colarse: seis
 * decimales situan a alguien con un metro de error, y eso sale del navegador
 * en la query string.
 */

import { describe, it, expect } from 'vitest';
import { roundCoordinate, COORDINATE_DECIMALS } from './geo';

describe('roundCoordinate', () => {
  it('deja tres decimales, unos 110 metros', () => {
    expect(COORDINATE_DECIMALS).toBe(3);
    expect(roundCoordinate(40.4168)).toBe(40.417);
    expect(roundCoordinate(-3.7038)).toBe(-3.704);
  });

  it('recorta una lectura de GPS con toda su precision', () => {
    // Lo que devuelve de verdad `pos.coords` en un movil
    expect(roundCoordinate(40.41677382)).toBe(40.417);
    expect(roundCoordinate(-3.70379409)).toBe(-3.704);
  });

  it('no toca lo que ya viene redondeado', () => {
    expect(roundCoordinate(40.417)).toBe(40.417);
    expect(roundCoordinate(0)).toBe(0);
    expect(roundCoordinate(-90)).toBe(-90);
  });

  it('no devuelve menos cero', () => {
    // -0 se serializa como "0" pero rompe cualquier comparacion estricta
    expect(Object.is(roundCoordinate(-0.0001), 0)).toBe(true);
  });

  it('devuelve null ante lo que no es un numero', () => {
    expect(roundCoordinate(undefined)).toBeNull();
    expect(roundCoordinate(null)).toBeNull();
    expect(roundCoordinate('40.4168')).toBeNull();
    expect(roundCoordinate(NaN)).toBeNull();
    expect(roundCoordinate(Infinity)).toBeNull();
  });
});
