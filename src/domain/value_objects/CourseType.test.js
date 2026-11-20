import { describe, it, expect } from 'vitest';
import { CourseType } from './CourseType';

// Los valores, tal cual circulan (golf_course/domain/value_objects/course_type.py)
const DEL_BACKEND = ['STANDARD_18', 'PITCH_AND_PUTT', 'EXECUTIVE'];

describe('CourseType', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(CourseType)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(CourseType)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(CourseType)).toBe(true);
  });
});
