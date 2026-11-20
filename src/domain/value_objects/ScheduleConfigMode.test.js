import { describe, it, expect } from 'vitest';
import { ScheduleConfigMode } from './ScheduleConfigMode';

// Los valores, tal cual los manda el backend (schedule_config_mode.py)
const DEL_BACKEND = ['AUTOMATIC', 'MANUAL'];

describe('ScheduleConfigMode', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(ScheduleConfigMode)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(ScheduleConfigMode)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ScheduleConfigMode)).toBe(true);
  });
});
