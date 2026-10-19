import { describe, it, expect } from 'vitest';
import { comunidadDelPunto, limitesDeLaComunidad } from './comunidadDelCampo';

/**
 * Las comunidades con ortofoto propia más reciente que la PNOA (19 oct): el
 * mapa elige la de la comunidad donde cae el campo (O6).
 */
describe('comunidadDelPunto', () => {
  it.each([
    ['El Prat', 41.5735, 2.0539, 'ES-CT'],
    ['PGA Catalunya', 41.8524, 2.7674, 'ES-CT'],
    ['Neguri', 43.3737, -3.028, 'ES-PV'],
    ['Ulzama', 42.9617, -1.667, 'ES-NC'],
    ['Centro Nacional', 40.487, -3.7383, 'ES-MD'],
  ])('%s cae en %s', (_, lat, lon, comunidad) => {
    expect(comunidadDelPunto({ lat, lon })).toBe(comunidad);
  });

  it.each([
    ['La Faisanera (Segovia)', 40.9155, -4.0564],
    ['Málaga', 36.72, -4.42],
    ['Zaragoza', 41.65, -0.88],
    ['Logroño', 42.465, -2.445],
    ['Guadalajara', 40.63, -3.16],
    // El enclave de Treviño (Burgos), un hueco dentro de Álava
    ['Treviño', 42.735, -2.745],
    ['Ponte de Lima (Portugal)', 41.7676, -8.5833],
  ])('%s no cae en ninguna', (_, lat, lon) => {
    expect(comunidadDelPunto({ lat, lon })).toBeNull();
  });

  it('sin punto, ninguna', () => {
    expect(comunidadDelPunto(null)).toBeNull();
    expect(comunidadDelPunto(undefined)).toBeNull();
  });
});

describe('limitesDeLaComunidad', () => {
  it('la caja [oeste, sur, este, norte] de la comunidad, que contiene sus campos', () => {
    const [oeste, sur, este, norte] = limitesDeLaComunidad('ES-CT');

    expect(oeste).toBeLessThan(2.0539);
    expect(este).toBeGreaterThan(2.7674);
    expect(sur).toBeLessThan(41.5735);
    expect(norte).toBeGreaterThan(41.8524);
    // Cataluña llega más o menos de 0,15 a 3,33 de longitud y de 40,5 a 42,9 de latitud
    expect(oeste).toBeGreaterThan(0);
    expect(este).toBeLessThan(3.5);
    expect(sur).toBeGreaterThan(40.4);
    expect(norte).toBeLessThan(43);
  });

  it('de una que no está, nada', () => {
    expect(limitesDeLaComunidad('ES-AN')).toBeNull();
  });
});
