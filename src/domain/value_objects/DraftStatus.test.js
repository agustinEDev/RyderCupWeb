import { describe, it, expect } from 'vitest';
import { DraftStatus, isValidDraftStatus } from './DraftStatus';

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

  it('isValidDraftStatus acepta cada valor', () => {
    for (const valor of DEL_BACKEND) {
      expect(isValidDraftStatus(valor)).toBe(true);
    }
  });

  it('isValidDraftStatus rechaza lo que no es un valor', () => {
    for (const valor of [
      undefined,
      null,
      '',
      'DESCONOCIDO',
      DEL_BACKEND[0].toLowerCase(),
    ]) {
      expect(isValidDraftStatus(valor)).toBe(false);
    }
  });
});
