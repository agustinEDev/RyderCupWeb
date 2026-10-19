import { describe, it, expect } from 'vitest';
import { hayMapaEnElPais } from './coberturaDelMapa';

/**
 * El mapa del hoyo solo tiene imagen en España (el PNOA del IGN): en un campo
 * de otro país no se ofrece (Agustín, 19 oct). Sin saber el país, sí: nadie
 * en España pierde el mapa por un dato que falte.
 */
describe('hayMapaEnElPais', () => {
  it('en España, sí', () => {
    expect(hayMapaEnElPais('ES')).toBe(true);
    // Escrito de otra forma, también (/code-review)
    expect(hayMapaEnElPais('es')).toBe(true);
    expect(hayMapaEnElPais(' ES ')).toBe(true);
  });

  it('en otro país, no', () => {
    expect(hayMapaEnElPais('PT')).toBe(false);
    expect(hayMapaEnElPais('FR')).toBe(false);
  });

  it('sin saber el país, sí', () => {
    expect(hayMapaEnElPais(null)).toBe(true);
    expect(hayMapaEnElPais(undefined)).toBe(true);
    // Solo espacios tampoco es un país (CodeRabbit)
    expect(hayMapaEnElPais('  ')).toBe(true);
  });
});
