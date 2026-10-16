import { describe, it, expect } from 'vitest';
import { muestrasDeLaBarra, esLaMismaBarra } from './muestrasDeLaBarra';

/**
 * Lo que ve un jugador de las muestras de un campo, según su barra (BE #532,
 * marcado por par).
 *
 * | Caso | Resumen del hoyo                                  | Barra             | primera | deOtra            | recoge |
 * |------|---------------------------------------------------|-------------------|---------|-------------------|--------|
 * | B1   | la mía, con muestra, ya no recoge                 | amarilla ♂        | la mía  | null              | false  |
 * | B2   | otra (la más antigua) y la mía                    | amarilla ♂        | la mía  | la otra           | según la mía |
 * | B3   | solo otras                                        | amarilla ♂        | null    | la más antigua    | true   |
 * | B4   | la misma color, otro género                       | roja ♀            | null    | la roja ♂         | true   |
 * | B5   | sin género en la barra y en el resumen            | roja (null)       | la roja | null              | según ella |
 * | B6   | sin barra                                         | null              | null    | la más antigua    | true   |
 * | B7   | otra barra listada sin primera (rota)             | amarilla ♂        | null    | la siguiente con primera | true |
 * | B8   | hoyo vacío, o resumen roto                        | cualquiera        | null    | null              | true   |
 */

const M = (lat) => ({ tee: { lat, lon: 0 }, bends: [], greenCenter: { lat: lat + 0.001, lon: 0 } });
const barra = (color, gender, primera, recoge = true) => ({ color, gender, primera, recoge });
const AMARILLA = { color: 'YELLOW', gender: 'MALE' };

describe('muestrasDeLaBarra', () => {
  it('B1: la de mi barra, sin otras', () => {
    expect(muestrasDeLaBarra({ 3: [barra('YELLOW', 'MALE', M(1), false)] }, AMARILLA)).toEqual({ 3: { primera: M(1), deOtra: null, recoge: false } });
  });

  it('B2: la mía y la de otra barra (la más antigua de las otras)', () => {
    const resumen = { 3: [barra('WHITE', 'MALE', M(2)), barra('BLUE', 'MALE', M(3)), barra('YELLOW', 'MALE', M(1), false)] };

    expect(muestrasDeLaBarra(resumen, AMARILLA)).toEqual({ 3: { primera: M(1), deOtra: M(2), recoge: false } });
  });

  it('B3: solo otras: sin primera mía, y la mía recoge', () => {
    expect(muestrasDeLaBarra({ 3: [barra('WHITE', 'MALE', M(2), false)] }, AMARILLA)).toEqual({ 3: { primera: null, deOtra: M(2), recoge: true } });
  });

  it('B4: el mismo color con otro género es otra barra', () => {
    const resumen = { 3: [barra('RED', 'MALE', M(2), false)] };

    expect(muestrasDeLaBarra(resumen, { color: 'RED', gender: 'FEMALE' })).toEqual({ 3: { primera: null, deOtra: M(2), recoge: true } });
  });

  it('B5: sin género es un valor más (null con null, o sin decir)', () => {
    const resumen = { 3: [barra('RED', null, M(1), false)] };

    expect(muestrasDeLaBarra(resumen, { color: 'RED', gender: null })[3]).toEqual({ primera: M(1), deOtra: null, recoge: false });
    expect(muestrasDeLaBarra(resumen, { color: 'RED' })[3].primera).toEqual(M(1));
    expect(muestrasDeLaBarra(resumen, { color: 'RED', gender: 'MALE' })[3].primera).toBeNull();
  });

  it('B6: sin barra, todo es de otra y se recoge', () => {
    const resumen = { 3: [barra('WHITE', 'MALE', M(2), false), barra('YELLOW', 'MALE', M(1), false)] };

    expect(muestrasDeLaBarra(resumen, null)).toEqual({ 3: { primera: null, deOtra: M(2), recoge: true } });
  });

  it('B7: una barra de otra listada sin primera no tapa a la siguiente', () => {
    const resumen = { 3: [barra('WHITE', 'MALE', null), barra('BLUE', 'MALE', M(3))] };

    expect(muestrasDeLaBarra(resumen, AMARILLA)[3].deOtra).toEqual(M(3));
  });

  it('B8: hoyo vacío o resumen roto: sin nada y recogiendo', () => {
    expect(muestrasDeLaBarra({ 3: [] }, AMARILLA)).toEqual({ 3: { primera: null, deOtra: null, recoge: true } });
    expect(muestrasDeLaBarra({ 3: 'roto', 4: [null] }, AMARILLA)).toEqual({
      3: { primera: null, deOtra: null, recoge: true },
      4: { primera: null, deOtra: null, recoge: true },
    });
    expect(muestrasDeLaBarra(null, AMARILLA)).toEqual({});
  });

  it('esLaMismaBarra: color y género, sin género = null', () => {
    expect(esLaMismaBarra({ color: 'RED', gender: null }, { color: 'RED' })).toBe(true);
    expect(esLaMismaBarra({ color: 'RED', gender: 'MALE' }, { color: 'RED', gender: 'FEMALE' })).toBe(false);
    expect(esLaMismaBarra({ color: 'RED', gender: 'MALE' }, { color: 'WHITE', gender: 'MALE' })).toBe(false);
    expect(esLaMismaBarra(null, { color: 'RED' })).toBe(false);
  });
});
