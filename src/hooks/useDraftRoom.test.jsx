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

const { default: useDraftRoom } = await import('./useDraftRoom');

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
});
