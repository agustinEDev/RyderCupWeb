import { describe, it, expect } from 'vitest';
import { TeeSource } from './TeeSource';

// Los valores, tal cual los manda el backend (CourseTeesDTO.source)
// PLAYED: la que jugó, con la competición terminada o cancelada (RyderCupAm #919)
const DEL_BACKEND = ['OWN', 'COURSE', 'GENERAL', 'DEFAULT', 'NONE', 'PLAYED'];

describe('TeeSource', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(TeeSource)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre, y no se puede cambiar', () => {
    for (const [clave, valor] of Object.entries(TeeSource))
      expect(valor).toBe(clave);
    expect(Object.isFrozen(TeeSource)).toBe(true);
  });
});
