import { describe, it, expect } from 'vitest';
import { GolfCourseApprovalStatus } from './GolfCourseApprovalStatus';

// Los valores, tal cual los manda el backend (modules/golf_course/domain/value_objects/approval_status.py)
const DEL_BACKEND = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

describe('GolfCourseApprovalStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(GolfCourseApprovalStatus)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(GolfCourseApprovalStatus)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(GolfCourseApprovalStatus)).toBe(true);
  });
});
