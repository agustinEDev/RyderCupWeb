import { describe, it, expect } from 'vitest';
import { barraDe, muestrasDeLaBarra, esLaMismaBarra } from './muestrasDeLaBarra';

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
 * | B9   | sin la exacta, la de mi color sin género (como `tee_for`) | amarilla ♂  | la sin género | null       | según ella |
 */

const M = (lat) => ({ tee: { lat, lon: 0 }, bends: [], greenCenter: { lat: lat + 0.001, lon: 0 } });
const barra = (color, gender, primera, recoge = true) => ({ color, gender, primera, recoge });
const AMARILLA = { color: 'YELLOW', gender: 'MALE' };
const MIA = M(1);
const OTRA = M(2);

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
    // Con género, sin la exacta, la sin género de su color es la suya (B9)
    expect(muestrasDeLaBarra(resumen, { color: 'RED', gender: 'MALE' })[3].primera).toEqual(M(1));
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

  // Como el servidor (`tee_for`): un campo con su barra sin género la da a
  // quien juega ese color con género, y las muestras vuelven sin género
  it('B9: sin mi barra exacta, la de mi color sin género es la mía', () => {
    const resumen = { 1: [{ color: 'YELLOW', gender: null, primera: MIA, recoge: false }] };

    expect(muestrasDeLaBarra(resumen, { color: 'YELLOW', gender: 'MALE' })[1]).toEqual({ primera: MIA, deOtra: null, recoge: false });
  });

  it('B9: si está la exacta, va antes que la sin género', () => {
    const resumen = { 1: [{ color: 'YELLOW', gender: null, primera: OTRA, recoge: true }, { color: 'YELLOW', gender: 'MALE', primera: MIA, recoge: true }] };

    expect(muestrasDeLaBarra(resumen, { color: 'YELLOW', gender: 'MALE' })[1].primera).toBe(MIA);
  });

  it('B9: al revés no (sin género no cae en la de un género)', () => {
    const resumen = { 1: [{ color: 'YELLOW', gender: 'MALE', primera: OTRA, recoge: false }] };

    expect(muestrasDeLaBarra(resumen, { color: 'YELLOW', gender: null })[1]).toEqual({ primera: null, deOtra: OTRA, recoge: true });
  });

  it('esLaMismaBarra: color y género, sin género = null', () => {
    expect(esLaMismaBarra({ color: 'RED', gender: null }, { color: 'RED' })).toBe(true);
    expect(esLaMismaBarra({ color: 'RED', gender: 'MALE' }, { color: 'RED', gender: 'FEMALE' })).toBe(false);
    expect(esLaMismaBarra({ color: 'RED', gender: 'MALE' }, { color: 'WHITE', gender: 'MALE' })).toBe(false);
    expect(esLaMismaBarra(null, { color: 'RED' })).toBe(false);
  });
});

describe('barraDe (la barra de un jugador de la anotación, #880)', () => {
  it.each([
    [{ color: 'YELLOW', teeGender: 'MALE' }, { color: 'YELLOW', gender: 'MALE' }],
    [{ color: 'RED', teeGender: null }, { color: 'RED', gender: null }],
    [{ color: 'RED' }, { color: 'RED', gender: null }],
    [{ color: null, teeGender: 'MALE' }, null],
    [undefined, null],
  ])('%o → %o', (jugador, barra) => {
    expect(barraDe(jugador)).toEqual(barra);
  });
});
