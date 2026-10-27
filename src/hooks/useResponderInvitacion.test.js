import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponderInvitacion } from './useResponderInvitacion';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock('../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({ falta: false, guardar: vi.fn(), refrescar: vi.fn() }),
}));
const responder = vi.hoisted(() => vi.fn());
vi.mock('../composition', () => ({ respondToInvitationUseCase: { execute: (...a) => responder(...a) } }));

beforeEach(() => {
  vi.clearAllMocks();
  responder.mockReturnValue(new Promise(() => {}));
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
