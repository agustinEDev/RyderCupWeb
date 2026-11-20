import { describe, it, expect } from 'vitest';
import { Team } from './Team';

// Los valores, tal cual los manda el backend (snake_draft_service.py)
const DEL_BACKEND = ['A', 'B'];

describe('Team', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(Team)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(Team)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(Team)).toBe(true);
  });
});
