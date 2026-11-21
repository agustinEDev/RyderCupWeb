import { describe, it, expect } from 'vitest';
import { ProfileRelation } from './ProfileRelation';

// Los valores, tal cual circulan (social/application/dto/profile_dto.py)
const DEL_BACKEND = [
  'NONE',
  'PENDING_SENT',
  'PENDING_RECEIVED',
  'ACCEPTED',
  'DECLINED',
  'BLOCKED',
];

describe('ProfileRelation', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(ProfileRelation)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(ProfileRelation)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ProfileRelation)).toBe(true);
  });
});
