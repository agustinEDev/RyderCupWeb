import { describe, it, expect } from 'vitest';
import { formatoDeIndice, formatoDeHandicapDeJuego } from './formatoDeHandicap';

// Un hándicap plus se guarda negativo (-2.0) y se lee «+2.0» (FE #797)
describe('formatoDeIndice', () => {
  it('H1: un plus se pinta con «+», no con «-»', () => {
    expect(formatoDeIndice(-2)).toBe('+2.0');
    expect(formatoDeIndice(-2.0)).toBe('+2.0');
    expect(formatoDeIndice(-5.3)).toBe('+5.3');
  });

  it('H1: un plus por debajo de uno también lleva su «+»', () => {
    expect(formatoDeIndice(-0.4)).toBe('+0.4');
  });

  it('H3: un hándicap positivo va sin signo y con un decimal', () => {
    expect(formatoDeIndice(12.4)).toBe('12.4');
    expect(formatoDeIndice(18)).toBe('18.0');
    expect(formatoDeIndice(54)).toBe('54.0');
  });

  it('H4: el cero va sin signo', () => {
    expect(formatoDeIndice(0)).toBe('0.0');
  });

  it('H4: el -0 no es «+0.0» ni «-0.0»', () => {
    expect(formatoDeIndice(-0)).toBe('0.0');
  });

  it('H4: un plus que redondea a cero no lleva signo', () => {
    expect(formatoDeIndice(-0.04)).toBe('0.0');
    expect(formatoDeIndice(0.04)).toBe('0.0');
  });

  it('redondea igual por los dos lados del cero', () => {
    expect(formatoDeIndice(-2.06)).toBe('+2.1');
    expect(formatoDeIndice(-2.04)).toBe('+2.0');
    expect(formatoDeIndice(-2.05)).toBe(`+${(2.05).toFixed(1)}`);
    expect(formatoDeIndice(2.06)).toBe('2.1');
  });

  it('acepta el número escrito como texto', () => {
    expect(formatoDeIndice('-2.0')).toBe('+2.0');
    expect(formatoDeIndice('12.4')).toBe('12.4');
    expect(formatoDeIndice(' -0.4 ')).toBe('+0.4');
  });

  it('H7: sin idioma, punto; con idioma, su separador', () => {
    expect(formatoDeIndice(-2)).toBe('+2.0');
    expect(formatoDeIndice(-2, 'es')).toBe('+2,0');
    expect(formatoDeIndice(12.4, 'es')).toBe('12,4');
    expect(formatoDeIndice(-2, 'en')).toBe('+2.0');
    expect(formatoDeIndice(0, 'es')).toBe('0,0');
  });

  it('H7: sin valor devuelve null, y cada pantalla pone lo suyo', () => {
    expect(formatoDeIndice(null)).toBeNull();
    expect(formatoDeIndice(undefined)).toBeNull();
    expect(formatoDeIndice('')).toBeNull();
    expect(formatoDeIndice('   ')).toBeNull();
    expect(formatoDeIndice('abc')).toBeNull();
    expect(formatoDeIndice(Number.NaN)).toBeNull();
    expect(formatoDeIndice(Infinity)).toBeNull();
  });
});

describe('formatoDeHandicapDeJuego', () => {
  it('H2: un plus se pinta con «+» y sin decimales', () => {
    expect(formatoDeHandicapDeJuego(-2)).toBe('+2');
    expect(formatoDeHandicapDeJuego(-10)).toBe('+10');
  });

  it('H3: positivo sin signo', () => {
    expect(formatoDeHandicapDeJuego(18)).toBe('18');
    expect(formatoDeHandicapDeJuego(1)).toBe('1');
  });

  it('H4: cero y -0 sin signo', () => {
    expect(formatoDeHandicapDeJuego(0)).toBe('0');
    expect(formatoDeHandicapDeJuego(-0)).toBe('0');
    expect(formatoDeHandicapDeJuego(-0.4)).toBe('0');
  });

  it('redondea igual por los dos lados del cero', () => {
    expect(formatoDeHandicapDeJuego(-2.6)).toBe('+3');
    expect(formatoDeHandicapDeJuego(2.6)).toBe('3');
  });

  it('acepta el número escrito como texto', () => {
    expect(formatoDeHandicapDeJuego('-2')).toBe('+2');
    expect(formatoDeHandicapDeJuego('18')).toBe('18');
  });

  it('H7: sin valor devuelve null', () => {
    expect(formatoDeHandicapDeJuego(null)).toBeNull();
    expect(formatoDeHandicapDeJuego(undefined)).toBeNull();
    expect(formatoDeHandicapDeJuego('')).toBeNull();
    expect(formatoDeHandicapDeJuego('x')).toBeNull();
  });
});
