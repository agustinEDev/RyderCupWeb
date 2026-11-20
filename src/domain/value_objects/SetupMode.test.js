import { describe, it, expect } from 'vitest';
import { SetupMode } from './SetupMode';

// Los valores, tal cual los manda el backend (setup_mode.py)
const DEL_BACKEND = ['AUTOMATIC', 'MANUAL', 'RYDER_CUP'];

describe('SetupMode', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(SetupMode)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(SetupMode)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(SetupMode)).toBe(true);
  });
});
