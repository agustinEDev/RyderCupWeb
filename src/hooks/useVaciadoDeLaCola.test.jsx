import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  // Los temporizadores falsos se devuelven SIEMPRE, aunque el test falle a
  // mitad: dejarlo al final del cuerpo los filtraba a los dos siguientes
  afterEach(() => {
    vi.useRealTimers();
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

  it('reintenta cuando el vaciado se para por algo que no es del golpe', async () => {
    // Portal cautivo de un club: el primer envío muere, se para, y al aceptar
    // las condiciones ya no vuelve a saltar `online` —el navegador nunca dejó
    // de decir que había red— ni `visibilitychange` —no se sale de la app—.
    // Sin reintento, la cola se quedaba llena, CON cobertura, hasta cerrar
    vi.useFakeTimers();
    vaciaLaColaEntera.mockResolvedValue({
      enviadas: 0, descartadas: 0, pendientes: 3, paroPor: 'no-es-de-esta',
    });

    await monta();
    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
  });

  it('pero no reintenta cuando ha ido bien', async () => {
    vi.useFakeTimers();
    vaciaLaColaEntera.mockResolvedValue({
      enviadas: 3, descartadas: 0, pendientes: 0, paroPor: null,
    });

    await monta();

    await act(async () => {
      vi.advanceTimersByTime(600_000);
      await Promise.resolve();
    });

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('no reintenta cuando el móvil no pudo escribir: reenviaría lo ya enviado', async () => {
    // El corte del bucle existe precisamente para no repetir un golpe que el
    // servidor ya tiene. Reintentarlo lo convertía en automático
    vi.useFakeTimers();
    vaciaLaColaEntera.mockResolvedValue({
      enviadas: 0, descartadas: 0, pendientes: 2, paroPor: 'no-se-pudo-borrar',
    });

    await monta();

    await act(async () => {
      vi.advanceTimersByTime(600_000);
      await Promise.resolve();
    });

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
  });

  it('y si otro vaciado tenía el cerrojo, no se da por bueno', async () => {
    // Confundirlo con «ha ido bien» desarmaba el reintento ya programado
    vi.useFakeTimers();
    vaciaLaColaEntera.mockResolvedValue({
      enviadas: 0, descartadas: 0, pendientes: 3, paroPor: 'ya-hay-otro',
    });

    await monta();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
  });

  describe('la escalera de reintentos (FE #551)', () => {
    const paradoCon = (pendientes = 3) =>
      ({ enviadas: 0, descartadas: 0, pendientes, paroPor: 'no-es-de-esta' });
    const avanza = async (ms) => {
      await act(async () => {
        vi.advanceTimersByTime(ms);
        await Promise.resolve();
      });
    };

    it('sube un peldaño por fallo y se para en el tercero', async () => {
      // Sin tope, una sesión muerta con la cola llena despertaba el móvil
      // cada cinco minutos el resto del día
      vi.useFakeTimers();
      vaciaLaColaEntera.mockResolvedValue(paradoCon());

      await monta();
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
      await avanza(30_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
      await avanza(120_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(3);
      await avanza(300_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(4);

      // Agotada: ya no hay más, por mucho que pase
      await avanza(3_600_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(4);

      // Hasta que algo cambia de verdad
      window.dispatchEvent(new globalThis.Event('online'));
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(5);
    });

    it('una vuelta limpia pero sin progreso no arma reintento ni cuenta como éxito', async () => {
      // El jugador está dentro de la única partida con cola: el bucle termina
      // limpio sin hacer nada. No hay nada que reintentar —no se paró—, y
      // tampoco es un éxito que reinicie nada
      vi.useFakeTimers();
      vaciaLaColaEntera.mockResolvedValue(paradoCon());
      await monta();
      // Al primer reintento, vuelta limpia sin progreso
      vaciaLaColaEntera.mockResolvedValueOnce(
        { enviadas: 0, descartadas: 0, pendientes: 3, paroPor: null }
      );
      await avanza(30_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);

      // Ni a los 120 s ni nunca: no se paró, así que no se reintenta
      await avanza(3_600_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
    });

    it('una señal de fuera es otro episodio: reinicia la escalera agotada', async () => {
      // Agotada una vez, el siguiente fallo de la tarde ya no se reintentaba
      // nunca: la vuelta de la red o volver a la app no tienen nada que ver
      // con la caída contra la que se agotó
      vi.useFakeTimers();
      vaciaLaColaEntera.mockResolvedValue(paradoCon());
      await monta();
      await avanza(30_000);
      await avanza(120_000);
      await avanza(300_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(4);

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(5);
      // Falló otra vez: vuelve a empezar por los 30 s, no se queda muda
      await avanza(30_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(6);
      await avanza(120_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(7);
    });

    it('una señal de fuera cancela el reintento que hubiera armado', async () => {
      // Sin cancelarlo, volver a la app a los 20 s dejaba el temporizador de
      // antes vivo, y disparaba a los 30 s una pasada que la suya ya suplía
      vi.useFakeTimers();
      vaciaLaColaEntera.mockResolvedValue(paradoCon());
      await monta();
      await avanza(20_000);
      await act(async () => {
        document.dispatchEvent(new globalThis.Event('visibilitychange'));
        await Promise.resolve();
      });
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
      // A los 30 s del arranque no dispara el viejo
      await avanza(10_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
      // A los 30 s de la señal, el nuevo
      await avanza(20_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(3);
    });

    it('el progreso reinicia la escalera y cancela el reintento armado', async () => {
      vi.useFakeTimers();
      vaciaLaColaEntera.mockResolvedValue(paradoCon());
      await monta();
      await avanza(30_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(2);
      // Hay uno armado a 120 s

      vaciaLaColaEntera.mockResolvedValueOnce(
        { enviadas: 3, descartadas: 0, pendientes: 0, paroPor: null }
      );
      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(3);

      // El armado se canceló: a los 120 s no salta
      await avanza(120_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(3);

      // Y el siguiente fallo vuelve a empezar por 30 s
      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(4);
      await avanza(30_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(5);
    });

    it('sin cobertura no arma nada: la vuelta de la red ya dispara', async () => {
      vi.useFakeTimers();
      vaciaLaColaEntera.mockResolvedValue(paradoCon());
      await monta();
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
      // Se armó el de 30 s. Antes de que salte, se va la red
      Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });

      await avanza(30_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);

      // Y tampoco dejó otra armada: si la hubiera, al volver la red saltaría
      // sola, sin esperar al evento `online`, que es quien tiene que disparar
      Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
      await avanza(3_600_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
    });

    it('un vaciado que resuelve después de desmontar no arma nada', async () => {
      // Nadie lo cancelaría: seguiría llamando con la sesión ya cerrada
      vi.useFakeTimers();
      let resuelve;
      vaciaLaColaEntera.mockReturnValue(new Promise((r) => { resuelve = r; }));
      const { unmount } = await monta();
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);

      unmount();
      await act(async () => {
        resuelve(paradoCon());
        await Promise.resolve();
      });

      await avanza(3_600_000);
      expect(vaciaLaColaEntera).toHaveBeenCalledTimes(1);
    });
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
