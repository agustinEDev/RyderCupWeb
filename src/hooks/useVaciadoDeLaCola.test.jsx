import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/vaciadoDeLaCola', () => ({
  vaciaLaColaEntera: vi.fn(() => Promise.resolve({ enviadas: 0, descartadas: 0, pendientes: 0 })),
}));

let rutaActual = '/dashboard';
vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: rutaActual }),
}));

import { vaciaLaColaEntera } from '../services/vaciadoDeLaCola';
import { useVaciadoDeLaCola } from './useVaciadoDeLaCola';

describe('useVaciadoDeLaCola (FE #521)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rutaActual = '/dashboard';
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('vacía al entrar', () => {
    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));

    expect(vaciaLaColaEntera).toHaveBeenCalledWith({ saltaPartida: null, userId: 'u1' });
  });

  it('no hace nada sin sesión', () => {
    renderHook(() => useVaciadoDeLaCola({ activo: false, userId: 'u1' }));
    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: null }));

    expect(vaciaLaColaEntera).not.toHaveBeenCalled();
  });

  it('vacía cuando vuelve la cobertura', () => {
    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));
    vi.clearAllMocks();

    window.dispatchEvent(new globalThis.Event('online'));

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('vacía al volver a la aplicación', () => {
    // En iOS una página suspendida no suele recibir `online`, y el caso típico
    // es terminar sin cobertura, guardar el móvil y sacarlo con wifi
    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));
    vi.clearAllMocks();

    document.dispatchEvent(new globalThis.Event('visibilitychange'));

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('no vacía cuando la aplicación se va al fondo', () => {
    // El mismo evento avisa de las dos cosas, y ahí no hay nada que enviar
    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));
    vi.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    document.dispatchEvent(new globalThis.Event('visibilitychange'));

    expect(vaciaLaColaEntera).not.toHaveBeenCalled();
  });

  it('deja fuera la partida que se está anotando', () => {
    // Esa la vacía su propia pantalla, que sabe resolver desacuerdos
    rutaActual = '/player/matches/m-7/scoring';

    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));

    expect(vaciaLaColaEntera).toHaveBeenCalledWith({ saltaPartida: 'm-7', userId: 'u1' });
  });

  it('también en partida rápida', () => {
    rutaActual = '/quick-matches/qm-3/scoring';

    renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));

    expect(vaciaLaColaEntera).toHaveBeenCalledWith({ saltaPartida: 'qm-3', userId: 'u1' });
  });

  it('no se relanza en cada cambio de pantalla', () => {
    // Colgado de la ruta, el efecto se rearmaba en cada navegación y disparaba
    // un vaciado entero cada vez
    const { rerender } = renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }));
    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);

    rutaActual = '/competitions';
    rerender();
    rutaActual = '/friends';
    rerender();

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('un fallo del vaciado no sube a la pantalla', async () => {
    vaciaLaColaEntera.mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useVaciadoDeLaCola({ activo: true, userId: 'u1' }))
    ).not.toThrow();
  });
});
