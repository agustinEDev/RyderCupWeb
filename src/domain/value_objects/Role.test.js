import { describe, it, expect } from 'vitest';
import { Role } from './Role';

// Los valores, tal cual los usan RoleGuard y el RBAC simplificado (ADR-009)
const DEL_BACKEND = ['ADMIN', 'CREATOR', 'PLAYER'];

describe('Role', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(Role)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(Role)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(Role)).toBe(true);
  });
});
