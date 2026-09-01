import { renderHook, act } from '@testing-library/react';
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
  // El vaciado al montar va aplazado un tick, para no meter peticiones en el
  // camino crítico del arranque: hay que dejar correr la microtarea
  const monta = async (opciones = { activo: true, userId: 'u1' }) => {
    let devuelto;
    await act(async () => {
      devuelto = renderHook(() => useVaciadoDeLaCola(opciones));
    });
    return devuelto;
  };

  /** Cómo quedó la llamada, con `saltaPartida` ya resuelta. */
  const loQuePidio = () => {
    const [args] = vaciaLaColaEntera.mock.calls.at(-1);
    return { userId: args.userId, saltaPartida: args.saltaPartida() };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    rutaActual = '/dashboard';
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  });

  it('vacía al entrar', async () => {
    await monta();

    expect(loQuePidio()).toEqual({ saltaPartida: null, userId: 'u1' });
  });

  it('no hace nada sin sesión', async () => {
    await monta({ activo: false, userId: 'u1' });
    await monta({ activo: true, userId: null });

    expect(vaciaLaColaEntera).not.toHaveBeenCalled();
  });

  it('no lo intenta sin cobertura: la petición se quedaría colgada', async () => {
    // Es el caso PARA el que existe esto. Sin la guarda, el arranque disparaba
    // una petición condenada y esperaba a que venciera —en iOS, decenas de
    // segundos en blanco— para descubrir lo que `navigator` ya decía
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });

    await monta();

    expect(vaciaLaColaEntera).not.toHaveBeenCalled();
  });

  it('vacía cuando vuelve la cobertura', async () => {
    await monta();
    vi.clearAllMocks();

    window.dispatchEvent(new globalThis.Event('online'));

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('vacía al volver a la aplicación', async () => {
    // En iOS una página suspendida no suele recibir `online`, y el caso típico
    // es terminar sin cobertura, guardar el móvil y sacarlo con wifi
    await monta();
    vi.clearAllMocks();

    document.dispatchEvent(new globalThis.Event('visibilitychange'));

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('no vacía cuando la aplicación se va al fondo', async () => {
    // El mismo evento avisa de las dos cosas, y ahí no hay nada que enviar
    await monta();
    vi.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

    document.dispatchEvent(new globalThis.Event('visibilitychange'));

    expect(vaciaLaColaEntera).not.toHaveBeenCalled();
  });

  it('deja fuera la partida que se está anotando', async () => {
    // Esa la vacía su propia pantalla, que sabe resolver desacuerdos
    rutaActual = '/player/matches/m-7/scoring';

    await monta();

    expect(loQuePidio()).toEqual({ saltaPartida: 'm-7', userId: 'u1' });
  });

  it('y también la partida en la que se ENTRA mientras vacía', async () => {
    // El vaciado tarda, y en ese rato el jugador puede abrir una de las
    // partidas que se están enviando. Por eso `saltaPartida` va como función:
    // congelada, se seguía vaciando por debajo de una pantalla ya montada
    const { rerender } = await monta();
    const [args] = vaciaLaColaEntera.mock.calls.at(-1);
    expect(args.saltaPartida()).toBeNull();

    // Navegar a la pantalla de esa partida mientras el envío sigue en vuelo
    rutaActual = '/player/matches/m-7/scoring';
    await act(async () => { rerender(); });

    expect(args.saltaPartida()).toBe('m-7');
  });

  it('también en partida rápida', async () => {
    rutaActual = '/quick-matches/qm-3/scoring';

    await monta();

    expect(loQuePidio()).toEqual({ saltaPartida: 'qm-3', userId: 'u1' });
  });

  it('no se relanza en cada cambio de pantalla', async () => {
    // Colgado de la ruta, el efecto se rearmaba en cada navegación y disparaba
    // un vaciado entero cada vez
    const { rerender } = await monta();
    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);

    rutaActual = '/competitions';
    rerender();
    rutaActual = '/friends';
    rerender();

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('un fallo del vaciado no sube a la pantalla', async () => {
    // El rechazo llega en una microtarea POSTERIOR a montar, así que un
    // `expect(...).not.toThrow()` alrededor de `renderHook` pasa igual con
    // `catch` y sin él: no probaba nada. Hay que esperarlo y mirar dónde acabó
    vaciaLaColaEntera.mockRejectedValueOnce(new Error('boom'));
    const enLaConsola = vi.spyOn(console, 'error').mockImplementation(() => {});

    await monta();
    await act(async () => { await Promise.resolve(); });

    expect(enLaConsola).toHaveBeenCalledWith(
      '[VaciadoDeLaCola] No se pudo vaciar la cola:',
      expect.objectContaining({ message: 'boom' })
    );
  });
});
