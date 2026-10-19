import { describe, it, expect } from 'vitest';
import { distanciaEnMetros, distanciaExacta } from './distanciasAlGreen';

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

describe('distanciaExacta', () => {
  it('sin redondear: 0,3 m no son 0', () => {
    const d = distanciaExacta({ lat: 36.28, lon: -5.33 }, { lat: 36.28 + 0.3 / 111195.08, lon: -5.33 });

    expect(d).toBeGreaterThan(0.29);
    expect(d).toBeLessThan(0.31);
  });

  it('distanciaEnMetros es la exacta redondeada', () => {
    const a = { lat: 36.28, lon: -5.33 };
    const b = { lat: 36.28123, lon: -5.33045 };

    expect(distanciaEnMetros(a, b)).toBe(Math.round(distanciaExacta(a, b)));
  });
});
