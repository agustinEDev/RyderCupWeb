import { describe, it, expect } from 'vitest';
import {
  separadorDecimal,
  IGUALES,
  LIMITES,
  formularioDeAjustes,
  diasDelTorneo,
  limiteEscrito,
  errorDeAjustes,
  ajustesParaCrear,
  cambiosDeAjustes,
  primeroLosAjustes,
} from './ajustesDeStrokePlay';

/**
 * Del formulario a la API y de vuelta, para los ajustes de un Stableford o un
 * Medal (FE #824). Casos de la tabla de la PR 2 (10 oct 2026).
 */
const formulario = (extra = {}) => ({
  modo: LIMITES,
  limites: [],
  categoriasIguales: '3',
  jornadas: '1',
  general: 'ACCUMULATED',
  ...extra,
});

describe('ajustesDeStrokePlay (FE #824)', () => {
  describe('el formulario de partida', () => {
    it('F1 (caso 4): sin ajustes, límites a mano sin límites, una jornada y acumulado', () => {
      expect(formularioDeAjustes(null)).toEqual(formulario());
    });

    it('F2: con límites, se escriben con un decimal y coma', () => {
      const f = formularioDeAjustes({ categoryLimits: [12, 26.5], categoryCount: null, maxMatchdaysPerPlayer: 2, overallStanding: 'BEST_CARD' });

      expect(f).toEqual(formulario({ limites: ['12,0', '26,5'], jornadas: '2', general: 'BEST_CARD' }));
    });

    it('F3 (caso 20): con categorías iguales se abre en ese modo y sin los límites del último cierre', () => {
      const f = formularioDeAjustes({ categoryLimits: [10, 20], categoryCount: 4, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' });

      expect(f.modo).toBe(IGUALES);
      expect(f.categoriasIguales).toBe('4');
      expect(f.limites).toEqual([]);
    });
  });

  describe('días y límites escritos', () => {
    it.each([
      ['2030-06-01', '2030-06-01', 1],
      ['2030-06-01', '2030-06-03', 3],
      // Con un cambio de hora en medio también son días enteros
      ['2030-03-29', '2030-03-31', 3],
      ['', '2030-06-01', null],
      // A medio escribir, con el fin antes del inicio: no hay torneo que medir
      ['2030-06-03', '2030-06-01', null],
      ['2030-06-03', '2030-06-02', null],
    ])('D: del %s al %s son %s días', (inicio, fin, dias) => {
      expect(diasDelTorneo(inicio, fin)).toBe(dias);
    });

    it.each([
      ['12', 12],
      ['12,5', 12.5],
      ['12.5', 12.5],
      [' -2,0 ', -2],
      ['', NaN],
      ['12a', NaN],
      // Solo números escritos como números (revisor)
      ['1e1', NaN],
      ['0x10', NaN],
      ['12.', NaN],
      ['+12', 12],
    ])('E: «%s» es %s', (escrito, numero) => {
      expect(limiteEscrito(escrito)).toBe(numero);
    });
  });

  describe('los errores (casos 7, 8, 11 y 12)', () => {
    it.each([
      [formulario(), 3, null],
      [formulario({ limites: ['12,0', '26,0'] }), 3, null],
      [formulario({ limites: ['26,0', '12,0'] }), 3, 'categoryLimitsOrder'],
      [formulario({ limites: ['12,35'] }), 3, 'categoryLimitOneDecimal'],
      [formulario({ limites: ['60'] }), 3, 'categoryLimitRange'],
      [formulario({ limites: [''] }), 3, 'categoryLimitEmpty'],
      [formulario({ limites: ['12,0', '  '] }), 3, 'categoryLimitEmpty'],
      [formulario({ modo: IGUALES, categoriasIguales: '6' }), 3, 'categoryCountRange'],
      // En categorías iguales, unos límites a medio escribir del otro modo no cuentan
      [formulario({ modo: IGUALES, limites: ['60'] }), 3, null],
      [formulario({ jornadas: '0' }), 3, 'matchdaysRange'],
      [formulario({ jornadas: '' }), 3, 'matchdaysRange'],
      [formulario({ jornadas: '4' }), 3, 'matchdaysMoreThanDays'],
      // Sin fechas todavía, las jornadas no se comparan con nada
      [formulario({ jornadas: '4' }), null, null],
    ])('V: %o en %s días → %s', (f, dias, error) => {
      expect(errorDeAjustes(f, dias)).toBe(error);
    });
  });

  describe('al crear (caso 14)', () => {
    it('C1: con límites manda los límites y no el contador', () => {
      expect(ajustesParaCrear(formulario({ limites: ['12,0', '26,0'], categoriasIguales: '4' }))).toEqual({
        category_limits: [12, 26],
        max_matchdays_per_player: 1,
        overall_standing: 'ACCUMULATED',
      });
    });

    it('C2 (caso 9): con categorías iguales manda el contador y no los límites', () => {
      expect(ajustesParaCrear(formulario({ modo: IGUALES, limites: ['12,0'], categoriasIguales: '3', jornadas: '2', general: 'BEST_CARD' }))).toEqual({
        category_count: 3,
        max_matchdays_per_player: 2,
        overall_standing: 'BEST_CARD',
      });
    });
  });

  describe('al editar (casos 15 y 16): solo lo que cambia', () => {
    const original = { categoryLimits: [12], categoryCount: null, maxMatchdaysPerPlayer: 1, overallStanding: 'ACCUMULATED' };

    it('E1: sin tocar nada, nada', () => {
      expect(cambiosDeAjustes(original, formularioDeAjustes(original))).toBeNull();
    });

    it('E2: «12» y «12,0» son el mismo límite', () => {
      expect(cambiosDeAjustes(original, formulario({ limites: ['12'] }))).toBeNull();
    });

    it('E3: otras jornadas, solo las jornadas', () => {
      expect(cambiosDeAjustes(original, formulario({ limites: ['12,0'], jornadas: '2' }))).toEqual({ maxMatchdaysPerPlayer: 2 });
    });

    it('E4: otros límites, solo los límites', () => {
      expect(cambiosDeAjustes(original, formulario({ limites: ['12,0', '26,0'] }))).toEqual({ categoryLimits: [12, 26] });
    });

    it('E5: quitar todos los límites es un cambio', () => {
      expect(cambiosDeAjustes(original, formulario())).toEqual({ categoryLimits: [] });
    });

    it('E6: pasar a categorías iguales manda solo el contador', () => {
      expect(cambiosDeAjustes(original, formulario({ modo: IGUALES, categoriasIguales: '3', limites: ['12,0'] }))).toEqual({ categoryCount: 3 });
    });

    it('E7: de iguales a límites a mano manda los límites', () => {
      const iguales = { ...original, categoryLimits: [], categoryCount: 3 };

      expect(cambiosDeAjustes(iguales, formulario({ limites: ['15,0'] }))).toEqual({ categoryLimits: [15] });
    });

    it('E7b: de iguales a límites a mano sin límites también es un cambio de modo', () => {
      const iguales = { ...original, categoryLimits: [], categoryCount: 3 };

      expect(cambiosDeAjustes(iguales, formulario())).toEqual({ categoryLimits: [] });
    });

    it('E8: en iguales, otro número', () => {
      const iguales = { ...original, categoryLimits: [], categoryCount: 3 };

      expect(cambiosDeAjustes(iguales, formulario({ modo: IGUALES, categoriasIguales: '4' }))).toEqual({ categoryCount: 4 });
    });

    it('E9: la general', () => {
      expect(cambiosDeAjustes(original, formulario({ limites: ['12,0'], general: 'BEST_CARD' }))).toEqual({ overallStanding: 'BEST_CARD' });
    });
  });

  describe('qué va primero al editar (caso 17)', () => {
    it.each([
      // Bajar jornadas y acortar fechas: las jornadas primero, o las fechas no caben
      [{ maxMatchdaysPerPlayer: 1 }, 3, true],
      // Subir jornadas que caben en las fechas de ahora: da igual, van primero
      [{ maxMatchdaysPerPlayer: 3 }, 3, true],
      // Subir jornadas que solo caben con las fechas nuevas: las fechas primero
      [{ maxMatchdaysPerPlayer: 4 }, 3, false],
      [{ categoryCount: 3 }, 1, true],
    ])('O: %o con %s días guardados → ajustes primero: %s', (cambios, diasGuardados, primero) => {
      expect(primeroLosAjustes(cambios, diasGuardados)).toBe(primero);
    });
  });
});

describe('el separador decimal del idioma (/code-review)', () => {
  it.each([
    ['es', ','],
    ['en', '.'],
    // Un idioma que Intl no acepta no rompe la carga: coma, la de la casa
    ['es_ES', ','],
    ['', ','],
  ])('«%s» → «%s»', (idioma, separador) => {
    expect(separadorDecimal(idioma)).toBe(separador);
  });
});
