import { describe, it, expect } from 'vitest';
import ScoringBreakdownMapper from './ScoringBreakdownMapper';

/**
 * La capa anticorrupción del desglose (FE #592).
 *
 * Lo que se vigila es lo mismo que en `PlayerStatsMapper` y un caso más: null
 * no es cero. `back_nine` a null significa "no jugó esa mitad"; convertirlo en
 * 0 diría que la jugó al par.
 */
describe('ScoringBreakdownMapper', () => {
  const respuesta = (extra = {}) => ({
    holes_counted: 9,
    rounds_counted: 1,
    gross_distribution: { birdie_or_better: 0, par: 2, bogey: 4, double_or_worse: 3, holes: 9 },
    net_distribution: { birdie_or_better: 2, par: 4, bogey: 3, double_or_worse: 0, holes: 9 },
    by_par: [{ par: 3, holes: 3, average_to_par: 1 }],
    front_nine: { holes: 9, average_to_par: 0.11 },
    back_nine: null,
    by_course: [
      { golf_course_id: 'c1', golf_course_name: 'Son Parc', rounds: 1, average_to_par: 2 },
    ],
    ...extra,
  });

  it('traduce las claves a camelCase', () => {
    const desglose = ScoringBreakdownMapper.toDomain(respuesta());

    expect(desglose.holesCounted).toBe(9);
    expect(desglose.grossDistribution.birdieOrBetter).toBe(0);
    expect(desglose.netDistribution.doubleOrWorse).toBe(0);
    expect(desglose.byPar[0]).toEqual({ par: 3, holes: 3, averageToPar: 1 });
    expect(desglose.byCourse[0].golfCourseName).toBe('Son Parc');
  });

  it('deja la mitad no jugada en null, no en cero', () => {
    const desglose = ScoringBreakdownMapper.toDomain(respuesta());

    expect(desglose.backNine).toBeNull();
    expect(desglose.frontNine.averageToPar).toBe(0.11);
  });

  it('conserva el cero cuando el cero es la respuesta', () => {
    const desglose = ScoringBreakdownMapper.toDomain(
      respuesta({ back_nine: { holes: 9, average_to_par: 0 } })
    );

    expect(desglose.backNine.averageToPar).toBe(0);
  });

  it('devuelve listas vacías para una cuenta sin vueltas', () => {
    const desglose = ScoringBreakdownMapper.toDomain({
      holes_counted: 0,
      rounds_counted: 0,
      gross_distribution: {},
      net_distribution: {},
      by_par: [],
      front_nine: null,
      back_nine: null,
      by_course: [],
    });

    expect(desglose.holesCounted).toBe(0);
    expect(desglose.byPar).toEqual([]);
    expect(desglose.byCourse).toEqual([]);
    expect(desglose.frontNine).toBeNull();
  });

  it('aguanta que falten las listas enteras', () => {
    const desglose = ScoringBreakdownMapper.toDomain({ holes_counted: 0 });

    expect(desglose.byPar).toEqual([]);
    expect(desglose.byCourse).toEqual([]);
    expect(desglose.grossDistribution.holes).toBe(0);
  });

  it('protesta si no llega respuesta', () => {
    expect(() => ScoringBreakdownMapper.toDomain(null)).toThrow('apiData is required');
  });
});
