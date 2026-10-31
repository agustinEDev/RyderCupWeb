import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponderInvitacion } from './useResponderInvitacion';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: toast }));
vi.mock('./useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({ falta: false, guardar: vi.fn(), refrescar: vi.fn() }),
}));
const responder = vi.hoisted(() => vi.fn());
vi.mock('../composition', () => ({ respondToInvitationUseCase: { execute: (...a) => responder(...a) } }));

beforeEach(() => {
  vi.clearAllMocks();
  responder.mockReturnValue(new Promise(() => {}));
});

describe('useResponderInvitacion — /code-review', () => {
  it('dice qué se está respondiendo; un segundo toque ignorado no lo cambia', () => {
    const { result } = renderHook(() => useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }));

    act(() => {
      result.current.aceptar('inv-1');
      result.current.rechazar('inv-1');
    });

    expect(result.current.accionEnCurso('inv-1')).toBe('ACCEPT');
    expect(result.current.accionEnCurso('inv-2')).toBeNull();
  });

  it('al aceptar, sigue en curso hasta que la pantalla se ha releído', async () => {
    responder.mockResolvedValue({});
    let releida;
    const alAceptar = vi.fn(() => new Promise((r) => { releida = r; }));
    const { result } = renderHook(() => useResponderInvitacion({ alAceptar, alCambiar: vi.fn() }));

    await act(async () => {
      result.current.aceptar('inv-1');
    });
    expect(alAceptar).toHaveBeenCalled();
    expect(result.current.seEstaRespondiendo('inv-1')).toBe(true);

    await act(async () => releida());
    expect(result.current.seEstaRespondiendo('inv-1')).toBe(false);
  });

  it.each([
    ['rechazar', 'rechazar', 'alCambiar'],
    ['aceptar', 'aceptar', 'alAceptar'],
  ])('%s bien y que falle la recarga no dice que no se pudo responder', async (_, accion, quien) => {
    responder.mockResolvedValue({});
    const falla = vi.fn().mockRejectedValue(new Error('sin red'));
    const opciones = { alAceptar: vi.fn(), alCambiar: vi.fn(), [quien]: falla };
    const { result } = renderHook(() => useResponderInvitacion(opciones));

    await act(async () => {
      await result.current[accion]('inv-1');
    });

    expect(falla).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.seEstaRespondiendo('inv-1')).toBe(false);
  });
});

describe('useResponderInvitacion — el candado es de cada invitación (revisor de la PR 3)', () => {
  it('con una en curso, otra se responde', () => {
    const { result } = renderHook(() => useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }));

    act(() => {
      result.current.rechazar('inv-1');
      result.current.aceptar('inv-2');
    });

    expect(responder.mock.calls).toEqual([['inv-1', 'DECLINE'], ['inv-2', 'ACCEPT']]);
  });
});

describe('useResponderInvitacion — I10: dos toques antes de pintar el botón desactivado', () => {
  it.each([
    ['aceptar', 'aceptar'],
    ['rechazar', 'rechazar'],
    ['aceptar y rechazar', 'aceptar', 'rechazar'],
  ])('%s: una sola respuesta', (_, primero, segundo = primero) => {
    const { result } = renderHook(() => useResponderInvitacion({ alAceptar: vi.fn(), alCambiar: vi.fn() }));

    act(() => {
      result.current[primero]('inv-1');
      result.current[segundo]('inv-1');
    });

    expect(responder).toHaveBeenCalledTimes(1);
  });
});

describe('useResponderInvitacion — equipos formados (29 oct 2026, F3)', () => {
  it('aceptar con los equipos formados: se dice y se relee la pantalla', async () => {
    responder.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, errorCode: 'TEAMS_FORMED' })
    );
    const alCambiar = vi.fn();
    const { result } = renderHook(() => useResponderInvitacion({ alAceptar: vi.fn(), alCambiar }));

    await act(async () => {
      await result.current.aceptar('inv-1');
    });

    expect(toast.error).toHaveBeenCalledWith('errors.teamsFormed');
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });
});
