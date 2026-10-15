import { describe, it, expect } from 'vitest';
import { distanciaEnMetros, distanciasAlGreen } from './distanciasAlGreen';

const GREEN = {
  front: { lat: 36.2898, lon: -5.332 },
  center: { lat: 36.29, lon: -5.332 },
  back: { lat: 36.2902, lon: -5.332 },
};

describe('distanciaEnMetros (D1)', () => {
  it('una milésima de grado de latitud son 111 metros', () => {
    expect(distanciaEnMetros({ lat: 36.28, lon: -5.33 }, { lat: 36.281, lon: -5.33 })).toBe(111);
  });

  it('el mismo punto está a 0 metros', () => {
    expect(distanciaEnMetros({ lat: 36.28, lon: -5.33 }, { lat: 36.28, lon: -5.33 })).toBe(0);
  });

  it('una milésima de longitud a 36° es menos que una de latitud (los meridianos se juntan)', () => {
    const d = distanciaEnMetros({ lat: 36.28, lon: -5.33 }, { lat: 36.28, lon: -5.329 });
    expect(d).toBe(90);
  });

  it('da metros enteros', () => {
    const d = distanciaEnMetros({ lat: 36.28, lon: -5.33 }, { lat: 36.28123, lon: -5.33045 });
    expect(Number.isInteger(d)).toBe(true);
  });
});

describe('distanciasAlGreen (D2, D3)', () => {
  it('D2: delante, centro y fondo desde donde está el jugador', () => {
    const jugador = { lat: 36.2888, lon: -5.332 };

    expect(distanciasAlGreen(jugador, GREEN)).toEqual({ front: 111, center: 133, back: 156 });
  });

  it('D3: un hoyo sin green no da distancias', () => {
    expect(distanciasAlGreen({ lat: 36.2888, lon: -5.332 }, null)).toBeNull();
  });

  it('sin posición no hay distancias', () => {
    expect(distanciasAlGreen(null, GREEN)).toBeNull();
  });
});
