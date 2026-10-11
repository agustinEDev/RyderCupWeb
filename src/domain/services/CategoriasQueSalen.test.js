import { describe, it, expect } from 'vitest';
import { categoriasQueSalen, REPETIDOS, MENOS_DE_SEIS } from './CategoriasQueSalen';

/**
 * El aviso de «salieron menos categorías» (FE #824, PR 8, caso 9; decidido el
 * 10 oct con la BE #536). Lo calcula el front con lo que ya tiene:
 *
 *   - pedidas: N categorías iguales, o los límites a mano + 1;
 *   - al cerrar, en «iguales» se reparten min(N, n // 6) y los límites
 *     repetidos se funden (hándicaps repetidos);
 *   - después, la regla de los seis funde las de menos de seis (vale también
 *     para los límites a mano): lo dice la categoría más alta de los inscritos.
 */
const ajustes = (extra = {}) => ({ categoryCount: null, categoryLimits: [], ...extra });

describe('categoriasQueSalen (FE #824, PR 8)', () => {
  it('sin categorías, o si salen todas, nada que avisar', () => {
    expect(categoriasQueSalen(ajustes(), [null, null], 12)).toBeNull();
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: [10, 20] }), [1, 2, 3], 18)).toBeNull();
    expect(categoriasQueSalen(ajustes({ categoryLimits: [12] }), [1, 2], 12)).toBeNull();
  });

  it('iguales: con pocos jugadores salen menos (n // 6)', () => {
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: [15] }), [1, 2], 14)).toEqual({ pedidas: 3, salen: 2, motivo: MENOS_DE_SEIS });
  });

  it('iguales: si los límites salen repetidos se funden (hándicaps repetidos)', () => {
    // 18 jugadores dan para 3; los límites se fundieron en uno
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: [12] }), [1, 2], 18)).toEqual({ pedidas: 3, salen: 2, motivo: REPETIDOS });
  });

  it('repetidos y además la regla de los seis: se dice lo último (menos de seis)', () => {
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: [12] }), [1, 1], 18)).toEqual({ pedidas: 3, salen: 1, motivo: MENOS_DE_SEIS });
  });

  it('a mano: la regla de los seis funde las de menos de seis', () => {
    expect(categoriasQueSalen(ajustes({ categoryLimits: [10, 20] }), [1, 2, 2], 9)).toEqual({ pedidas: 3, salen: 2, motivo: MENOS_DE_SEIS });
  });

  it('iguales: tras repartir, la regla de los seis también puede fundir', () => {
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: [10, 20] }), [1, 2], 18)).toEqual({ pedidas: 3, salen: 2, motivo: MENOS_DE_SEIS });
  });

  it.each([
    ['una categoría pedida', ajustes({ categoryCount: 1 }), [1], 12],
    ['cero', ajustes({ categoryCount: 0 }), [1], 12],
  ])('%s: no hay nada que avisar', (_caso, a, cats, n) => {
    expect(categoriasQueSalen(a, cats, n)).toBeNull();
  });

  it.each([
    [5, 1],
    [11, 1],
    [17, 2],
  ])('iguales con %i jugadores: salen %i, por menos de seis', (n, salen) => {
    const limites = Array.from({ length: salen - 1 }, (_, i) => 10 + i);
    const cats = Array.from({ length: salen }, (_, i) => i + 1);
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: limites }), cats, n)).toEqual({ pedidas: 3, salen, motivo: MENOS_DE_SEIS });
  });

  it('iguales con 18 jugadores salen las 3: frontera exacta', () => {
    expect(categoriasQueSalen(ajustes({ categoryCount: 3, categoryLimits: [10, 20] }), [1, 2, 3], 18)).toBeNull();
  });

  it('antes de repartir (inscritos sin categoría) no se avisa de nada', () => {
    expect(categoriasQueSalen(ajustes({ categoryCount: 3 }), [null, null], 18)).toBeNull();
  });
});
