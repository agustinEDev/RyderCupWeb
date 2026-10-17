import { describe, it, expect } from 'vitest';
import { tarjetaDelHoyo } from './tarjetaDelHoyo';

/**
 * Lo que dicen las barras de un hoyo, en una línea (Agustín, 17 oct): el par y
 * de la barra más corta a la más larga. Casos E8–E11 aprobados en el chat.
 */
const barra = (par, metros) => ({ color: 'WHITE', gender: 'MALE', identifier: null, par, metros });

describe('tarjetaDelHoyo', () => {
  it('E8: de la más corta a la más larga, y el par de la más larga', () => {
    expect(tarjetaDelHoyo([barra(5, 500), barra(5, 430), barra(5, 470)])).toEqual({
      parMinimo: 5,
      parMaximo: 5,
      metrosMinimo: 430,
      metrosMaximo: 500,
      parDeLaMasLarga: 5,
    });
  });

  it('E9: todas iguales', () => {
    expect(tarjetaDelHoyo([barra(4, 350), barra(4, 350)])).toMatchObject({ metrosMinimo: 350, metrosMaximo: 350 });
  });

  it('E10: sin metros en ninguna barra, el par y nada más', () => {
    expect(tarjetaDelHoyo([barra(4, null), barra(4, null)])).toEqual({
      parMinimo: 4,
      parMaximo: 4,
      metrosMinimo: null,
      metrosMaximo: null,
      parDeLaMasLarga: 4,
    });
  });

  it('E10: una barra sin metros no cuenta para los metros', () => {
    expect(tarjetaDelHoyo([barra(4, null), barra(4, 320), barra(4, 360)])).toMatchObject({ metrosMinimo: 320, metrosMaximo: 360 });
  });

  it('E11: el par cambia entre barras: los dos, y los codos con el de la más larga', () => {
    expect(tarjetaDelHoyo([barra(5, 410), barra(4, 480)])).toEqual({
      parMinimo: 4,
      parMaximo: 5,
      metrosMinimo: 410,
      metrosMaximo: 480,
      parDeLaMasLarga: 4,
    });
  });

  it('E11: sin metros, el par de la más larga es el mayor', () => {
    expect(tarjetaDelHoyo([barra(4, null), barra(5, null)]).parDeLaMasLarga).toBe(5);
  });

  it('sin barras, o sin par en ninguna, nada', () => {
    expect(tarjetaDelHoyo([])).toBeNull();
    expect(tarjetaDelHoyo(undefined)).toBeNull();
    expect(tarjetaDelHoyo([barra(null, null)])).toBeNull();
  });

  it('una barra sin par no cuenta para el par', () => {
    expect(tarjetaDelHoyo([barra(null, 300), barra(3, 150)])).toMatchObject({ parMinimo: 3, parMaximo: 3, metrosMaximo: 300 });
  });

  it('dos barras igual de largas con distinto par: el par mayor', () => {
    expect(tarjetaDelHoyo([barra(4, 450), barra(5, 450)]).parDeLaMasLarga).toBe(5);
    expect(tarjetaDelHoyo([barra(5, 450), barra(4, 450)]).parDeLaMasLarga).toBe(5);
  });
});
