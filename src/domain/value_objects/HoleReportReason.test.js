import { describe, it, expect } from 'vitest';
import { HoleReportReason } from './HoleReportReason';

// Los valores, tal cual circulan (golf_course/domain/entities/hole_report.py)
const DEL_BACKEND = ['WRONG_HOLE', 'WRONG_LINE', 'HOLE_CHANGED'];

describe('HoleReportReason', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(HoleReportReason)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(HoleReportReason)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(HoleReportReason)).toBe(true);
  });
});
