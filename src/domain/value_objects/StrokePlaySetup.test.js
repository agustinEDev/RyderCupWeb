import { describe, it, expect } from 'vitest';
import {
  StrokePlaySetup,
  errorDeLimites,
  errorDeCategoriasIguales,
  errorDeJornadas,
  categoriasDeLosLimites,
  ACUMULADO,
  MEJOR_TARJETA,
} from './StrokePlaySetup';

/**
 * Lo que solo tiene un Stableford o un Medal (FE #824, RyderCupAm#251 y #536):
 * categorías (límites a mano o N iguales), jornadas por jugador y la general.
 * Las reglas son las del backend; aquí se comprueban antes de enviar.
 */
describe('StrokePlaySetup (FE #824)', () => {
  describe('la pieza', () => {
    it('S1: por defecto, sin categorías, una jornada y la general acumulada', () => {
      const ajustes = new StrokePlaySetup({});

      expect(ajustes.categoryLimits).toEqual([]);
      expect(ajustes.categoryCount).toBeNull();
      expect(ajustes.maxMatchdaysPerPlayer).toBe(1);
      expect(ajustes.overallStanding).toBe(ACUMULADO);
      expect(ajustes.categoriasIguales).toBe(false);
    });

    it('S2: con un contador son categorías iguales', () => {
      const ajustes = new StrokePlaySetup({ categoryCount: 3 });

      expect(ajustes.categoriasIguales).toBe(true);
    });

    it('S3: es inmutable', () => {
      const ajustes = new StrokePlaySetup({ categoryLimits: [12] });

      expect(Object.isFrozen(ajustes)).toBe(true);
      expect(Object.isFrozen(ajustes.categoryLimits)).toBe(true);
    });

    it('S4: la general es acumulada o mejor tarjeta', () => {
      expect(new StrokePlaySetup({ overallStanding: MEJOR_TARJETA }).overallStanding).toBe('BEST_CARD');
      expect(() => new StrokePlaySetup({ overallStanding: 'OTRA' })).toThrow();
    });
  });

  describe('límites a mano', () => {
    it.each([
      [[], null],
      [[12], null],
      [[12, 26], null],
      [[-10, 0, 20.5, 54], null],
      [[1, 2, 3, 4, 5], 'categoryLimitsTooMany'],
      [[-10.1], 'categoryLimitRange'],
      [[54.1], 'categoryLimitRange'],
      [[NaN], 'categoryLimitRange'],
      [[Infinity], 'categoryLimitRange'],
      [[12.35], 'categoryLimitOneDecimal'],
      [[26, 12], 'categoryLimitsOrder'],
      [[12, 12], 'categoryLimitsOrder'],
    ])('L: %o → %s', (limites, error) => {
      expect(errorDeLimites(limites)).toBe(error);
    });

    it('L2: 12,3 es un decimal aunque en coma flotante no lo parezca', () => {
      expect(errorDeLimites([12.3, 20.1])).toBeNull();
    });
  });

  describe('categorías iguales', () => {
    it.each([
      [2, null],
      [5, null],
      [1, 'categoryCountRange'],
      [6, 'categoryCountRange'],
      [2.5, 'categoryCountRange'],
      [NaN, 'categoryCountRange'],
    ])('C: %s → %s', (n, error) => {
      expect(errorDeCategoriasIguales(n)).toBe(error);
    });
  });

  describe('jornadas por jugador', () => {
    it.each([
      [1, 1, null],
      [2, 3, null],
      [3, 3, null],
      [4, 3, 'matchdaysMoreThanDays'],
      [0, 3, 'matchdaysRange'],
      [1.5, 3, 'matchdaysRange'],
      [NaN, 3, 'matchdaysRange'],
    ])('J: %s jornadas en %s días → %s', (jornadas, dias, error) => {
      expect(errorDeJornadas(jornadas, dias)).toBe(error);
    });
  });

  describe('vista previa de las categorías', () => {
    it('V1: con 12,0 y 26,0 salen tres, y la última es «más de 26,0» (revisor)', () => {
      expect(categoriasDeLosLimites([12, 26])).toEqual([
        { numero: 1, desde: null, hasta: 12, masDe: null },
        { numero: 2, desde: 12.1, hasta: 26, masDe: null },
        { numero: 3, desde: null, hasta: null, masDe: 26 },
      ]);
    });

    it('V2: sin límites, una sola sin rango', () => {
      expect(categoriasDeLosLimites([])).toEqual([{ numero: 1, desde: null, hasta: null, masDe: null }]);
    });

    it('V3: el «desde» es un decimal limpio, también con plus', () => {
      expect(categoriasDeLosLimites([-0.5, 9.9, 20]).map((c) => c.desde)).toEqual([null, -0.4, 10, null]);
    });
  });
});
