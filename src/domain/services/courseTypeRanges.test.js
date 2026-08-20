import { describe, it, expect } from 'vitest';
import {
  PAR_RANGE_BY_COURSE_TYPE,
  RATING_RANGE_BY_COURSE_TYPE,
  SLOPE_RANGE_BY_COURSE_TYPE,
  COURSE_TYPES,
  parRangeFor,
  ratingRangeFor,
  slopeRangeFor,
  isTotalParValid,
} from './courseTypeRanges';

/**
 * Estos valores son los del backend (`GolfCourse`, RyderCupAm#206). Si se tocan
 * alli sin tocarlos aqui, el formulario acepta campos que la API rechaza —o al
 * reves— y el usuario se queda sin saber por que no puede dar de alta un campo.
 */
describe('courseTypeRanges', () => {
  it('cubre los tres tipos de campo en las tres tablas', () => {
    for (const tabla of [
      PAR_RANGE_BY_COURSE_TYPE,
      RATING_RANGE_BY_COURSE_TYPE,
      SLOPE_RANGE_BY_COURSE_TYPE,
    ]) {
      expect(Object.keys(tabla).sort()).toEqual([...COURSE_TYPES].sort());
    }
  });

  it('mantiene los valores que valida el backend', () => {
    expect(parRangeFor('PITCH_AND_PUTT')).toEqual([54, 60]);
    expect(parRangeFor('EXECUTIVE')).toEqual([61, 65]);
    expect(parRangeFor('STANDARD_18')).toEqual([66, 76]);

    expect(ratingRangeFor('PITCH_AND_PUTT')).toEqual([45, 90]);
    expect(ratingRangeFor('STANDARD_18')).toEqual([50, 90]);

    // 160 y no 155: hay campos federados por encima del maximo WHS
    expect(slopeRangeFor('STANDARD_18')).toEqual([55, 160]);
    expect(slopeRangeFor('PITCH_AND_PUTT')).toEqual([40, 155]);
  });

  it('trata un tipo ausente o desconocido como campo estandar', () => {
    // Lo que asume el backend cuando no hay tipo. No es "lo mas estricto": el
    // techo de slope estandar (160) es MAS alto que el de un campo corto (155).
    for (const desconocido of [undefined, null, '', 'LINKS']) {
      expect(parRangeFor(desconocido)).toEqual([66, 76]);
      expect(ratingRangeFor(desconocido)).toEqual([50, 90]);
      expect(slopeRangeFor(desconocido)).toEqual([55, 160]);
    }
  });

  it('valida el par total contra el rango de su tipo, no contra el de 18 hoyos', () => {
    expect(isTotalParValid(54, 'PITCH_AND_PUTT')).toBe(true);
    expect(isTotalParValid(54, 'STANDARD_18')).toBe(false);
    expect(isTotalParValid(66, 'EXECUTIVE')).toBe(false);
    expect(isTotalParValid(65, 'EXECUTIVE')).toBe(true);
  });

  it('incluye los extremos de cada rango', () => {
    expect(isTotalParValid(60, 'PITCH_AND_PUTT')).toBe(true);
    expect(isTotalParValid(61, 'PITCH_AND_PUTT')).toBe(false);
    expect(isTotalParValid(66, 'STANDARD_18')).toBe(true);
    expect(isTotalParValid(76, 'STANDARD_18')).toBe(true);
    expect(isTotalParValid(77, 'STANDARD_18')).toBe(false);
  });
});
