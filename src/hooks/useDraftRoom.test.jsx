import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * La sala de draft, vista desde la pantalla (FE #653).
 *
 * Dos cosas que no se ven en ningún otro sitio: que el contador se dibuja
 * contra la hora del SERVIDOR —dos móviles con el reloj descuadrado verían
 * minutos distintos, y el adelantado daría el turno por perdido antes de
 * tiempo— y que la sala se refresca sola mientras está en marcha, que es
 * además lo que hace que el servidor resuelva los turnos agotados.
 */
const mockGet = vi.fn();
const mockStart = vi.fn();
const mockPick = vi.fn();

vi.mock('../composition', () => ({
  getDraftUseCase: { execute: (...a) => mockGet(...a) },
  startDraftUseCase: { execute: (...a) => mockStart(...a) },
  makeDraftPickUseCase: { execute: (...a) => mockPick(...a) },
}));

const { default: useDraftRoom, crearReloj } = await import('./useDraftRoom');

// El móvil va 5 minutos adelantado respecto al servidor, a propósito
const AHORA_LOCAL = new Date('2030-06-01T10:05:00Z').getTime();

const sala = (extra = {}) => ({
  id: 's1',
  competitionId: 'c1',
  status: 'IN_PROGRESS',
  firstPick: 'A',
  currentTeam: 'A',
  turnStartedAt: '2030-06-01T10:00:00',
  secondsPerTurn: 60,
  serverTime: '2030-06-01T10:00:20',
  teamACaptainId: 'ana',
  teamBCaptainId: 'bea',
  teamA: ['ana'],
  teamB: ['bea'],
  picks: [],
  availablePlayers: [{ userId: 'dani', name: 'Dani Díaz', handicap: 12 }],
  ...extra,
});

describe('useDraftRoom (FE #653)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `shouldAdvanceTime` para que `waitFor` no se quede colgado: con los
    // temporizadores parados del todo, sus reintentos nunca llegan
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(AHORA_LOCAL);
    mockGet.mockResolvedValue(sala());
    mockStart.mockResolvedValue(sala());
    mockPick.mockResolvedValue(sala({ currentTeam: 'B' }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('H1: carga la sala al entrar', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));

    await waitFor(() => expect(result.current.sala).not.toBeNull());
    expect(mockGet).toHaveBeenCalledWith('c1');
    expect(result.current.cargando).toBe(false);
  });

  it('H2: el contador sale de la hora del servidor, no de la del móvil', async () => {
    // El servidor dice que el turno empezó a las 10:00:00 y que son las
    // 10:00:20: quedan 40 segundos, aunque el móvil vaya cinco minutos por
    // delante. Contando con el reloj local, el turno parecería perdido
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));

    await waitFor(() => expect(result.current.sala).not.toBeNull());
    expect(result.current.segundosRestantes).toBe(40);
  });

  it('H3: y baja segundo a segundo sin volver a preguntar', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.segundosRestantes).toBe(37);
  });

  it('H4: nunca baja de cero', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());

    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.segundosRestantes).toBe(0);
  });

  it('H5: se refresca sola mientras la sala está en marcha', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    const cargasIniciales = mockGet.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(mockGet.mock.calls.length).toBeGreaterThan(cargasIniciales);
  });

  it('H5b: y no más de doce veces por minuto, que el cubo del límite es de todos', async () => {
    // La sala la miran los doce a la vez y comparten el mismo cubo de rate
    // limit (ADR-038): a tres segundos, doce móviles pasan de 240 peticiones
    // por minuto y la ceremonia entera se cae con 429 —y con ella el turno
    // agotado, que lo resuelve justo este GET—
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    mockGet.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    expect(mockGet.mock.calls.length).toBeLessThanOrEqual(12);
  });

  // #710: el capitán que entra antes del sorteo se quedaba en «todavía no se ha
  // lanzado» mientras en el servidor ya corría su turno. La espera no preguntaba
  it('H5c: antes del sorteo también se refresca, y se entera de que empezó', async () => {
    mockGet.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.sala).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    await waitFor(() => expect(result.current.sala?.status).toBe('IN_PROGRESS'));
  });

  it('H5e: un fallo mientras se espera el sorteo no para la espera (revisión local)', async () => {
    // Un 429 del cubo compartido o un corte: el capitán se quedaba otra vez en
    // «todavía no se ha lanzado» hasta recargar
    mockGet
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(Object.assign(new Error('Demasiadas peticiones'), { status: 429 }))
      .mockResolvedValue(sala());
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    await waitFor(() => expect(result.current.sala?.status).toBe('IN_PROGRESS'));
  });

  it('H5f: un error del refresco que se recupera se quita de la pantalla (CodeRabbit)', async () => {
    mockGet
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(Object.assign(new Error('Demasiadas peticiones'), { status: 429 }))
      .mockResolvedValue(sala());
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    await waitFor(() => expect(result.current.error).toBe('Demasiadas peticiones'));
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    await waitFor(() => expect(result.current.sala?.status).toBe('IN_PROGRESS'));
    expect(result.current.error).toBeNull();
  });

  it('H5g: al cambiar de competición, lo cargado de la anterior no vale (CodeRabbit)', async () => {
    // Cargada la c1 (sin sorteo aún), la c2 da 403: no se insiste con ella
    mockGet.mockImplementation(async (id) => {
      if (id === 'c1') return null;
      throw Object.assign(new Error('No eres de esta competición'), { status: 403 });
    });
    const { result, rerender } = renderHook(({ id }) => useDraftRoom(id, 'ana'), {
      initialProps: { id: 'c1' },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    rerender({ id: 'c2' });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    const llamadasC2 = () => mockGet.mock.calls.filter(([id]) => id === 'c2').length;
    const antes = llamadasC2();
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(llamadasC2()).toBe(antes);
  });

  it('H5d: si no se pudo cargar, no se insiste cada cinco segundos', async () => {
    mockGet.mockRejectedValue(Object.assign(new Error('No eres de esta competición'), { status: 403 }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    mockGet.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('H6: terminada deja de preguntar: ya no cambia nada', async () => {
    mockGet.mockResolvedValue(sala({ status: 'COMPLETED', currentTeam: null, turnStartedAt: null }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    const cargas = mockGet.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(20000);
    });

    expect(mockGet.mock.calls.length).toBe(cargas);
    expect(result.current.segundosRestantes).toBeNull();
  });

  it('H7: dice si le toca a quien mira', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));

    await waitFor(() => expect(result.current.sala).not.toBeNull());
    expect(result.current.esMiTurno).toBe(true);
  });

  it('H8: al capitán del otro equipo no le toca', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'bea'));

    await waitFor(() => expect(result.current.sala).not.toBeNull());
    expect(result.current.esMiTurno).toBe(false);
  });

  it('H9: a quien no capitanea nada, tampoco', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'dani'));

    await waitFor(() => expect(result.current.sala).not.toBeNull());
    expect(result.current.esMiTurno).toBe(false);
  });

  it('H10: elegir deja en pantalla lo que responde el servidor, sin esperar al refresco', async () => {
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());

    await act(async () => {
      await result.current.elegir('dani');
    });

    expect(mockPick).toHaveBeenCalledWith('c1', 'dani');
    expect(result.current.sala.currentTeam).toBe('B');
  });

  it('H11: si el turno ya no es suyo, lo dice y refresca', async () => {
    // 409: se le acabó el minuto y la aplicación eligió por él. La pantalla
    // tiene que enseñar lo que pasó, no el error a secas
    mockPick.mockRejectedValue(Object.assign(new Error('No es tu turno'), { status: 409 }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    const cargas = mockGet.mock.calls.length;

    await act(async () => {
      await result.current.elegir('dani');
    });

    expect(result.current.error).toBe('turnoPerdido');
    expect(mockGet.mock.calls.length).toBeGreaterThan(cargas);
  });

  it('H11b: y el aviso no se lo lleva el refresco de tres segundos después', async () => {
    // El refresco trae la sala nueva, que es lo que se quiere; borrar el aviso
    // dejaría al capitán sin saber por qué eligió otro por él
    mockPick.mockRejectedValue(Object.assign(new Error('No es tu turno'), { status: 409 }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    await act(async () => {
      await result.current.elegir('dani');
    });

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(result.current.error).toBe('turnoPerdido');
  });

  it('H11d: si con su minuto agotado la sala terminó, lo dice en ese momento', async () => {
    // La app eligió al penúltimo por él y el último entró solo: ya no le toca
    // a nadie. Se decide con la sala que trae el 409, no al pintar: si no, un
    // turno perdido de antes cambiaba de texto al terminar la sala el rival
    mockPick.mockRejectedValue(Object.assign(new Error('No es tu turno'), { status: 409 }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    mockGet.mockResolvedValue(sala({ status: 'COMPLETED', currentTeam: null, availablePlayers: [] }));

    await act(async () => {
      await result.current.elegir('dani');
    });

    expect(result.current.error).toBe('turnoPerdidoYTerminado');
  });

  it('H11e: y un turno perdido de antes no cambia de texto cuando la sala termina', async () => {
    mockPick.mockRejectedValue(Object.assign(new Error('No es tu turno'), { status: 409 }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    await act(async () => {
      await result.current.elegir('dani');
    });
    mockGet.mockResolvedValue(sala({ status: 'COMPLETED', currentTeam: null, availablePlayers: [] }));

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.sala.status).toBe('COMPLETED');
    expect(result.current.error).toBe('turnoPerdido');
  });

  it('H11c: una respuesta atrasada no resucita al jugador ya elegido', async () => {
    // El GET que salió antes puede volver DESPUÉS del POST: sin secuenciar,
    // la sala retrocede, el elegido reaparece en «por elegir» y el capitán
    // vuelve a pulsar para llevarse un 409 que es mentira
    let devolverLaVieja;
    mockGet.mockImplementationOnce(() => Promise.resolve(sala()));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());

    mockGet.mockImplementationOnce(
      () => new Promise((resolve) => { devolverLaVieja = () => resolve(sala()); })
    );
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    mockPick.mockResolvedValue(sala({ currentTeam: 'B', availablePlayers: [] }));
    await act(async () => {
      await result.current.elegir('dani');
    });

    await act(async () => {
      devolverLaVieja();
      await Promise.resolve();
    });

    expect(result.current.sala.availablePlayers).toEqual([]);
    expect(result.current.sala.currentTeam).toBe('B');
  });

  it('H11d: un fallo de una petición vieja no pisa la pantalla de ahora', async () => {
    // El GET que salió antes puede fallar DESPUÉS de una elección correcta:
    // sin comprobar la generación, la sala se queda con un error que ya no
    // describe nada de lo que hay en pantalla
    let fallarLaVieja;
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.sala).not.toBeNull());
    mockGet.mockImplementationOnce(
      () => new Promise((_, reject) => { fallarLaVieja = () => reject(new Error('Boom')); })
    );
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    await act(async () => {
      await result.current.elegir('dani');
    });

    await act(async () => {
      fallarLaVieja();
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
  });

  it('H15: un reloj que no se entiende no pinta un contador imposible', async () => {
    // Con una fecha ilegible `Date.parse` da NaN y la pantalla enseñaba
    // «NaN:NaN» donde debería ir el minuto
    mockGet.mockResolvedValue(sala({ turnStartedAt: 'no es una fecha' }));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));

    await waitFor(() => expect(result.current.sala).not.toBeNull());
    expect(result.current.segundosRestantes).toBeNull();
  });

  it('H12: sin sala todavía, no hay contador ni error', async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.sala).toBeNull();
    expect(result.current.segundosRestantes).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('H13: abrir la sala la deja pintada sin recargar la pantalla', async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.abrirSala();
    });

    expect(mockStart).toHaveBeenCalledWith('c1');
    expect(result.current.sala.status).toBe('IN_PROGRESS');
  });

  it('H14: un fallo al cargar no deja la pantalla en blanco eternamente', async () => {
    mockGet.mockRejectedValue(new Error('Boom'));
    const { result } = renderHook(() => useDraftRoom('c1', 'ana'));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe('Boom');
  });

  // T5: la carga y el contador sin `setState` dentro de un efecto. Lo que se ve
  // no cambia, salvo que lo que llega tarde ya no se pinta
  describe('T5 · lo que llega tarde y el reloj', () => {
    it('T5-1: en marcha, seis peticiones en 30 s, ni más ni menos; terminada, ninguna', async () => {
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      mockGet.mockClear();

      // De cinco en cinco segundos, como los da el navegador: cada latido del
      // sondeo en su propia tarea, con la pantalla pintada entre uno y otro
      for (let i = 0; i < 6; i += 1) {
        await act(async () => {
          vi.advanceTimersByTime(5000);
        });
      }
      expect(mockGet).toHaveBeenCalledTimes(6);

      mockGet.mockResolvedValue(sala({ status: 'COMPLETED', currentTeam: null, turnStartedAt: null }));
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      await waitFor(() => expect(result.current.sala.status).toBe('COMPLETED'));
      mockGet.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('T5-2b: tras elegir o lanzar el sorteo, los refrescos siguientes sí se pintan', async () => {
      // Lo que se descarta es solo lo que salió ANTES de la elección
      mockGet.mockResolvedValueOnce(null);
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.cargando).toBe(false));
      await act(async () => {
        await result.current.abrirSala();
      });
      await act(async () => {
        await result.current.elegir('dani');
      });
      expect(result.current.sala.currentTeam).toBe('B');
      mockGet.mockResolvedValue(sala({ status: 'COMPLETED', currentTeam: null, turnStartedAt: null }));

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => expect(result.current.sala.status).toBe('COMPLETED'));
    });

    it('T5-3: esperando el sorteo, el refresco que vuelve tras lanzarlo no cierra la sala', async () => {
      // El GET del sondeo salió antes de lanzar el sorteo y vuelve después con
      // «aún no hay sala»: volvía «todavía no se ha lanzado» con el botón de
      // lanzar, que el servidor ya rechaza
      mockGet.mockResolvedValueOnce(null);
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.cargando).toBe(false));
      let devolverLaVieja;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolverLaVieja = () => resolve(null); })
      );
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(devolverLaVieja).toBeTypeOf('function');

      await act(async () => {
        await result.current.abrirSala();
      });
      expect(result.current.sala?.status).toBe('IN_PROGRESS');
      await act(async () => {
        devolverLaVieja();
        await Promise.resolve();
      });

      expect(result.current.sala?.status).toBe('IN_PROGRESS');
    });

    it('T5-3b: y si ese refresco viejo falla, tampoco deja un error', async () => {
      mockGet.mockResolvedValueOnce(null);
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.cargando).toBe(false));
      let fallarLaVieja;
      mockGet.mockImplementationOnce(
        () => new Promise((_, reject) => { fallarLaVieja = () => reject(new Error('Boom')); })
      );
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await act(async () => {
        await result.current.abrirSala();
      });
      await act(async () => {
        fallarLaVieja();
        await Promise.resolve();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.sala?.status).toBe('IN_PROGRESS');
    });

    it('T5-4: 409 y un sondeo que sustituye la recarga: un aviso, decidido con la sala más nueva', async () => {
      mockPick.mockRejectedValue(Object.assign(new Error('No es tu turno'), { status: 409 }));
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      let devolverLaRecarga;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolverLaRecarga = () => resolve(sala({ currentTeam: 'B' })); })
      );
      mockGet.mockResolvedValue(sala({ status: 'COMPLETED', currentTeam: null, availablePlayers: [] }));

      let eleccion;
      await act(async () => {
        eleccion = result.current.elegir('dani');
      });
      await waitFor(() => expect(devolverLaRecarga).toBeTypeOf('function'));
      expect(result.current.error).toBe('turnoPerdido');
      // El sondeo sale mientras la recarga sigue en vuelo, y trae la sala terminada
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      await act(async () => {
        devolverLaRecarga();
        await eleccion;
      });

      expect(result.current.sala.status).toBe('COMPLETED');
      expect(result.current.error).toBe('turnoPerdidoYTerminado');
    });

    it('T5-5: de c1 a c2 sin desmontar, sin volver a la espera y sin pintar lo de c1 que llega tarde', async () => {
      const { result, rerender } = renderHook(({ id }) => useDraftRoom(id, 'ana'), {
        initialProps: { id: 'c1' },
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      let devolverC1;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolverC1 = () => resolve(sala({ id: 'vieja-c1' })); })
      );
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      let devolverC2;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolverC2 = () => resolve(sala({ id: 's2', competitionId: 'c2' })); })
      );

      rerender({ id: 'c2' });
      expect(result.current.cargando).toBe(false);
      await act(async () => {
        devolverC2();
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.sala.id).toBe('s2'));
      await act(async () => {
        devolverC1();
        await Promise.resolve();
      });

      expect(result.current.sala.id).toBe('s2');
      expect(result.current.cargando).toBe(false);
    });

    it('T5-6: al cambiar de turno, el primer pintado ya cuenta el minuto nuevo', async () => {
      // Antes, el primer pintado de la sala nueva enseñaba un instante el
      // número del turno anterior, hasta que corría el efecto del contador
      const pintados = [];
      const { result } = renderHook(() => {
        const r = useDraftRoom('c1', 'ana');
        pintados.push([r.sala?.turnStartedAt, r.segundosRestantes]);
        return r;
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      // El turno nuevo empezó en el servidor a las 10:00:25, justo ahora
      mockGet.mockResolvedValue(
        sala({ currentTeam: 'B', turnStartedAt: '2030-06-01T10:00:25', serverTime: '2030-06-01T10:00:25' })
      );

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      await waitFor(() => expect(result.current.sala.currentTeam).toBe('B'));

      const delTurnoNuevo = pintados.filter(([empezo]) => empezo === '2030-06-01T10:00:25');
      expect(delTurnoNuevo.length).toBeGreaterThan(0);
      expect(delTurnoNuevo[0][1]).toBe(60);
    });

    it('T5-6b: y al arrancar, el primer pintado con sala ya trae el contador', async () => {
      const pintados = [];
      const { result } = renderHook(() => {
        const r = useDraftRoom('c1', 'ana');
        pintados.push([r.sala, r.segundosRestantes]);
        return r;
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());

      const conSala = pintados.filter(([s]) => s !== null);
      expect(conSala[0][1]).toBe(40);
    });

    it('T5-7: en el mismo turno, otra hora del servidor no salta al llegar: se ajusta en el siguiente segundo', async () => {
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      expect(result.current.segundosRestantes).toBe(40);
      let devolver;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolver = () => resolve(sala({ serverTime: '2030-06-01T10:00:45' })); })
      );
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.segundosRestantes).toBe(35);

      // Llega diciendo que en el servidor son diez segundos más
      await act(async () => {
        devolver();
        await Promise.resolve();
      });
      expect(result.current.segundosRestantes).toBe(35);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.segundosRestantes).toBe(14);
    });

    it('T5-18: una elección que falla con 500 enseña el error y lo quita la recarga que va bien', async () => {
      mockPick.mockRejectedValue(Object.assign(new Error('Boom'), { status: 500 }));
      let devolver;
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      mockGet.mockImplementationOnce(() => new Promise((resolve) => { devolver = () => resolve(sala()); }));

      let eleccion;
      await act(async () => {
        eleccion = result.current.elegir('dani');
      });
      await waitFor(() => expect(devolver).toBeTypeOf('function'));
      expect(result.current.error).toBe('Boom');
      await act(async () => {
        devolver();
        await eleccion;
      });

      expect(result.current.error).toBeNull();
    });

    it('T5-4b: el 409 no da la sala por terminada con una recarga que no llegó a pintarse', async () => {
      // La recarga del 409 vuelve con la sala terminada, pero entretanto otra
      // elección del mismo capitán ya dejó en pantalla una sala más nueva: esa
      // recarga no se pinta, y no puede decidir el aviso
      mockPick
        .mockRejectedValueOnce(Object.assign(new Error('No es tu turno'), { status: 409 }))
        .mockResolvedValueOnce(sala({ currentTeam: 'B' }));
      const { result } = renderHook(() => useDraftRoom('c1', 'ana'));
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      let devolverLaRecarga;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => {
          devolverLaRecarga = () => resolve(sala({ status: 'COMPLETED', currentTeam: null, availablePlayers: [] }));
        })
      );

      let primera;
      await act(async () => {
        primera = result.current.elegir('dani');
      });
      await waitFor(() => expect(devolverLaRecarga).toBeTypeOf('function'));
      await act(async () => {
        await result.current.elegir('eva');
      });
      expect(result.current.sala.currentTeam).toBe('B');
      await act(async () => {
        devolverLaRecarga();
        await primera;
      });

      expect(result.current.sala.status).toBe('IN_PROGRESS');
      expect(result.current.error).not.toBe('turnoPerdidoYTerminado');
    });

    it('T5-5b: de c1 a c2, mientras llega la de c2 no queda la sala de c1, y sin la espera de pantalla', async () => {
      const { result, rerender } = renderHook(({ id }) => useDraftRoom(id, 'ana'), {
        initialProps: { id: 'c1' },
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      expect(result.current.cargandoSala).toBe(false);
      let devolverC2;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolverC2 = () => resolve(sala({ id: 's2', competitionId: 'c2' })); })
      );

      rerender({ id: 'c2' });

      expect(result.current.cargando).toBe(false);
      expect(result.current.cargandoSala).toBe(true);
      expect(result.current.sala).toBeNull();
      expect(result.current.segundosRestantes).toBeNull();
      expect(result.current.esMiTurno).toBe(false);
      await act(async () => {
        devolverC2();
        await Promise.resolve();
      });
      await waitFor(() => expect(result.current.sala?.id).toBe('s2'));
      expect(result.current.cargandoSala).toBe(false);
    });

    it('T5-5c: si la de c2 falla, se ve su error y nada de la sala de c1', async () => {
      const { result, rerender } = renderHook(({ id }) => useDraftRoom(id, 'ana'), {
        initialProps: { id: 'c1' },
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      mockGet.mockRejectedValueOnce(new Error('Boom'));

      rerender({ id: 'c2' });

      await waitFor(() => expect(result.current.error).toBe('Boom'));
      expect(result.current.sala).toBeNull();
      expect(result.current.cargandoSala).toBe(false);
    });

    it('T5-5d: una elección de c1 que vuelve tras pasar a c2 no pinta su sala en c2 ni frena la carga de c2', async () => {
      const { result, rerender } = renderHook(({ id }) => useDraftRoom(id, 'ana'), {
        initialProps: { id: 'c1' },
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      let devolverLaEleccion;
      mockPick.mockImplementationOnce(
        () => new Promise((resolve) => { devolverLaEleccion = () => resolve(sala({ id: 'de-c1', currentTeam: 'B' })); })
      );
      let devolverC2;
      mockGet.mockImplementationOnce(
        () => new Promise((resolve) => { devolverC2 = () => resolve(sala({ id: 's2', competitionId: 'c2' })); })
      );
      let eleccion;
      await act(async () => {
        eleccion = result.current.elegir('dani');
      });

      rerender({ id: 'c2' });
      await act(async () => {
        devolverLaEleccion();
        await eleccion;
      });
      expect(result.current.sala).toBeNull();
      await act(async () => {
        devolverC2();
        await Promise.resolve();
      });

      await waitFor(() => expect(result.current.sala?.id).toBe('s2'));
      expect(result.current.cargandoSala).toBe(false);
    });

    it('T5-5e: una elección de c1 que vuelve cuando ya se ve c2 no cambia la sala de c2', async () => {
      const { result, rerender } = renderHook(({ id }) => useDraftRoom(id, 'ana'), {
        initialProps: { id: 'c1' },
      });
      await waitFor(() => expect(result.current.sala).not.toBeNull());
      let devolverLaEleccion;
      mockPick.mockImplementationOnce(
        () => new Promise((resolve) => { devolverLaEleccion = () => resolve(sala({ id: 'de-c1', currentTeam: 'B' })); })
      );
      mockGet.mockResolvedValue(sala({ id: 's2', competitionId: 'c2' }));
      let eleccion;
      await act(async () => {
        eleccion = result.current.elegir('dani');
      });

      rerender({ id: 'c2' });
      await waitFor(() => expect(result.current.sala?.id).toBe('s2'));
      await act(async () => {
        devolverLaEleccion();
        await eleccion;
      });

      expect(result.current.sala.id).toBe('s2');
      expect(result.current.sala.currentTeam).toBe('A');
    });

    it('T5-20: el reloj late con UN solo temporizador, escuche quien escuche', () => {
      const reloj = crearReloj();
      const antes = vi.getTimerCount();
      const dejarUno = reloj.suscribir(() => {});
      const dejarOtro = reloj.suscribir(() => {});
      expect(vi.getTimerCount() - antes).toBe(1);

      dejarUno();
      expect(vi.getTimerCount() - antes).toBe(1);
      dejarOtro();
      expect(vi.getTimerCount() - antes).toBe(0);
    });

    it('T5-20b: y avisa a todos los que escuchan en cada latido', () => {
      const reloj = crearReloj();
      const uno = vi.fn();
      const otro = vi.fn();
      const dejarUno = reloj.suscribir(uno);
      const dejarOtro = reloj.suscribir(otro);

      vi.advanceTimersByTime(1000);
      dejarUno();
      vi.advanceTimersByTime(1000);
      dejarOtro();

      expect(uno).toHaveBeenCalledTimes(1);
      expect(otro).toHaveBeenCalledTimes(2);
    });
  });
});
