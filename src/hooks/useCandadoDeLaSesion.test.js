import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * El candado de la sesión de anotación: una sola pantalla anotando por cuenta (T4).
 *
 *   #      caso                                                        | qué pasa
 *   -------|----------------------------------------------------------|----------------------------------
 *   T4-30  jugador del partido A; monta                                 | suelta lo viejo, coge A, no bloqueado, refresca cada 30 s
 *   T4-31  otra sesión mía coge A y localStorage lo confirma            | bloqueado
 *   T4-32  otra sesión, pero localStorage dice la mía / otro partido,   | no bloqueado
 *          o el aviso es de otro usuario, de otro partido o con scope  |
 *   T4-33  bloqueado; se suelta el candado y lo cojo                    | desbloqueado (si no lo cojo, sigue)
 *   T4-34  bloqueado; «tomar la sesión»                                 | suelta, coge, desbloqueado y refresca
 *   T4-35  bloqueado en A; pasa a B                                     | ya en el pintado de B, no bloqueado; coge B
 *   T4-36  bloqueado; cambia el usuario                                 | no bloqueado
 *   T4-37  bloqueado en A; se retira                                    | sigue bloqueado (como hoy, P2)
 *   T4-38  retirado tras estar bloqueado; vuelve a contar               | no bloqueado y vuelve a coger el candado
 *   T4-39  un aviso tardío al oyente de A con B ya en pantalla          | el bloqueo de B no cambia
 */

const lock = vi.hoisted(() => ({
  oyente: null,
  forceRelease: vi.fn(),
  acquire: vi.fn(),
  release: vi.fn(),
  refresh: vi.fn(),
  getSession: vi.fn(),
  onLockEvent: vi.fn(),
}));
vi.mock('../utils/scoringSessionLock', () => ({
  forceRelease: (...a) => lock.forceRelease(...a),
  acquire: (...a) => lock.acquire(...a),
  release: (...a) => lock.release(...a),
  refresh: (...a) => lock.refresh(...a),
  getSession: (...a) => lock.getSession(...a),
  onLockEvent: (...a) => lock.onLockEvent(...a),
}));

const { useCandadoDeLaSesion } = await import('./useCandadoDeLaSesion');

const MIA = 's-mia';
const sessionIdRef = { current: MIA };
const JUGADOR = { matchId: 'A', currentUserId: 'u1', isMatchPlayer: true, isWithdrawn: false };

// Cada pintado, con sus props y lo que devolvió
const pintados = [];
const monta = (props = {}) =>
  renderHook(
    (p) => {
      const r = useCandadoDeLaSesion({ ...p, sessionIdRef });
      pintados.push({ ...p, ...r });
      return r;
    },
    { initialProps: { ...JUGADOR, ...props } }
  );
const avisa = (evento) => act(() => lock.oyente(evento));
const otraCogeA = { type: 'LOCK_ACQUIRED', userId: 'u1', sessionId: 's-otra', matchId: 'A' };
const bloqueado = () => {
  lock.getSession.mockReturnValue({ sessionId: 's-otra', matchId: 'A' });
  const montado = monta();
  avisa(otraCogeA);
  expect(montado.result.current.isSessionBlocked).toBe(true);
  return montado;
};

beforeEach(() => {
  vi.clearAllMocks();
  pintados.length = 0;
  lock.oyente = null;
  lock.acquire.mockReturnValue(true);
  lock.getSession.mockReturnValue(null);
  lock.onLockEvent.mockImplementation((oyente) => {
    lock.oyente = oyente;
    return () => {
      if (lock.oyente === oyente) lock.oyente = null;
    };
  });
});
afterEach(() => vi.useRealTimers());

describe('useCandadoDeLaSesion (T4)', () => {
  it('T4-30: al montar suelta lo viejo, coge el de A, no está bloqueado y refresca cada 30 s', () => {
    vi.useFakeTimers();
    const { result } = monta();

    expect(lock.forceRelease).toHaveBeenCalledWith('u1');
    expect(lock.acquire).toHaveBeenCalledWith('A', MIA, 'u1');
    expect(result.current.isSessionBlocked).toBe(false);
    act(() => vi.advanceTimersByTime(30000));
    expect(lock.refresh).toHaveBeenCalledWith(MIA, 'u1');
  });

  it('T4-31: otra sesión mía coge A y localStorage lo confirma: bloqueado', () => {
    bloqueado();
  });

  it.each([
    ['localStorage sigue con la mía', { sessionId: MIA, matchId: 'A' }, otraCogeA],
    ['localStorage es de otro partido', { sessionId: 's-otra', matchId: 'B' }, otraCogeA],
    ['sin nada en localStorage', null, otraCogeA],
    ['el aviso es de otro usuario', { sessionId: 's-otra', matchId: 'A' }, { ...otraCogeA, userId: 'u2' }],
    ['el aviso es de otro partido', { sessionId: 's-otra', matchId: 'A' }, { ...otraCogeA, matchId: 'B' }],
    ['el aviso lleva scope (la cola de fondo)', { sessionId: 's-otra', matchId: 'A' }, { ...otraCogeA, scope: 'drain' }],
    ['el aviso es de mi propia sesión', { sessionId: 's-otra', matchId: 'A' }, { ...otraCogeA, sessionId: MIA }],
  ])('T4-32: no se bloquea si %s', (_caso, enLocalStorage, evento) => {
    lock.getSession.mockReturnValue(enLocalStorage);
    const { result } = monta();

    avisa(evento);

    expect(result.current.isSessionBlocked).toBe(false);
  });

  it('T4-33: bloqueado, se suelta el candado y lo cojo: desbloqueado; si no lo cojo, sigue', () => {
    const { result } = bloqueado();

    lock.acquire.mockReturnValueOnce(false);
    avisa({ type: 'LOCK_RELEASED', userId: 'u1' });
    expect(result.current.isSessionBlocked).toBe(true);

    avisa({ type: 'LOCK_RELEASED', userId: 'u1' });
    expect(lock.acquire).toHaveBeenLastCalledWith('A', MIA, 'u1');
    expect(result.current.isSessionBlocked).toBe(false);
  });

  it('T4-34: bloqueado, «tomar la sesión» suelta, coge, desbloquea y refresca', () => {
    vi.useFakeTimers();
    const { result } = bloqueado();
    vi.clearAllMocks();

    act(() => result.current.takeOverSession());

    expect(lock.forceRelease).toHaveBeenCalledWith('u1');
    expect(lock.acquire).toHaveBeenCalledWith('A', MIA, 'u1');
    expect(result.current.isSessionBlocked).toBe(false);
    act(() => vi.advanceTimersByTime(30000));
    expect(lock.refresh).toHaveBeenCalledWith(MIA, 'u1');
  });

  it('T4-35: bloqueado en A, al pasar a B ya en su pintado no está bloqueado, y coge B', () => {
    const { result, rerender } = bloqueado();

    rerender({ ...JUGADOR, matchId: 'B' });

    const deB = pintados.filter((p) => p.matchId === 'B');
    expect(deB.length).toBeGreaterThan(0);
    expect(deB.every((p) => p.isSessionBlocked === false)).toBe(true);
    expect(lock.release).toHaveBeenCalledWith(MIA, 'u1');
    expect(lock.acquire).toHaveBeenLastCalledWith('B', MIA, 'u1');
    expect(result.current.isSessionBlocked).toBe(false);
  });

  it('T4-36: bloqueado, al cambiar de usuario deja de estarlo', () => {
    const { result, rerender } = bloqueado();

    rerender({ ...JUGADOR, currentUserId: 'u2' });

    expect(lock.acquire).toHaveBeenLastCalledWith('A', MIA, 'u2');
    expect(result.current.isSessionBlocked).toBe(false);
  });

  it('T4-37: bloqueado en A, al retirarse sigue viendo «sesión tomada» (como hoy, P2) y suelta el candado', () => {
    const { result, rerender } = bloqueado();

    rerender({ ...JUGADOR, isWithdrawn: true });

    expect(lock.release).toHaveBeenCalledWith(MIA, 'u1');
    expect(result.current.isSessionBlocked).toBe(true);
  });

  it('T4-38: retirado tras estar bloqueado, al volver a contar se desbloquea y vuelve a coger el candado', () => {
    const { result, rerender } = bloqueado();
    rerender({ ...JUGADOR, isWithdrawn: true });
    lock.acquire.mockClear();

    rerender({ ...JUGADOR, isWithdrawn: false });

    expect(lock.acquire).toHaveBeenCalledWith('A', MIA, 'u1');
    expect(result.current.isSessionBlocked).toBe(false);
  });

  // /code-review: el oyente del partido A sigue suscrito hasta la limpieza del
  // efecto, que llega después del pintado de B. Con `act` el pintado y la
  // limpieza van juntos, así que se guarda el oyente de A y se le llama ya con B
  // en pantalla: es lo que hace un aviso que llega en ese hueco
  it.each([
    ['otra sesión coge A', otraCogeA, false],
    ['se suelta el candado (y lo cojo para A)', { type: 'LOCK_RELEASED', userId: 'u1' }, true],
  ])('T4-39: un aviso tardío para el oyente de A (%s) no toca el bloqueo de B', (_caso, evento, bloqueadaEnB) => {
    const oyentes = [];
    lock.onLockEvent.mockImplementation((oyente) => {
      oyentes.push(oyente);
      lock.oyente = oyente;
      return () => {};
    });
    lock.getSession.mockReturnValue({ sessionId: 's-otra', matchId: 'B' });
    const { result, rerender } = monta();
    const oyenteDeA = oyentes[0];
    rerender({ ...JUGADOR, matchId: 'B' });
    // B, bloqueado o no según el caso, por su propio oyente
    if (bloqueadaEnB) avisa({ ...otraCogeA, matchId: 'B' });
    expect(result.current.isSessionBlocked).toBe(bloqueadaEnB);
    lock.getSession.mockReturnValue({ sessionId: 's-otra', matchId: 'A' });

    act(() => oyenteDeA(evento));

    expect(result.current.isSessionBlocked).toBe(bloqueadaEnB);
  });
});
