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
      vi.advanceTimersByTime(4000);
    });

    expect(mockGet.mock.calls.length).toBeGreaterThan(cargasIniciales);
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
