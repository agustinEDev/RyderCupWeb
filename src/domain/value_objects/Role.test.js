import { describe, it, expect } from 'vitest';
import { Role } from './Role';

// Los valores que usa RoleGuard (ADR-009). El backend no tiene enum de roles:
// manda is_admin / is_creator / is_player
const EN_EL_FRONT = ['ADMIN', 'CREATOR', 'PLAYER'];

describe('Role', () => {
  it('tiene los valores que circulan por el front, en ese orden y con esa grafía', () => {
    expect(Object.values(Role)).toEqual(EN_EL_FRONT);
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
