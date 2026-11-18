import { describe, it, expect } from 'vitest';
import { MatchOutcome } from './MatchOutcome';

// Los valores, tal cual los manda el backend (modules/social/domain/services/head_to_head.py (Outcome) + UNFINISHED de get_recent_matches_use_case.py y games_together.py)
const DEL_BACKEND = ['WON', 'LOST', 'HALVED', 'UNFINISHED'];

describe('MatchOutcome', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(MatchOutcome)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(MatchOutcome)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(MatchOutcome)).toBe(true);
  });
});
