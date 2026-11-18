import { describe, it, expect } from 'vitest';
import { DraftStatus } from './DraftStatus';

// Los valores, tal cual los manda el backend (modules/competition/domain/value_objects/draft_status.py)
const DEL_BACKEND = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

describe('DraftStatus', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(DraftStatus)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(DraftStatus)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(DraftStatus)).toBe(true);
  });
});
