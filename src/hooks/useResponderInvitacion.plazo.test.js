import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponderInvitacion } from './useResponderInvitacion';

/**
 * F3 · Aceptar una invitación pasado el plazo de inscripción (15 nov 2026;
 * RyderCupAm #865): el servidor contesta 400 ENROLLMENT_DEADLINE_PASSED.
 *
 *   caso                                        | qué pasa
 *   --------------------------------------------|------------------------------------------
 *   I1 aceptar pasado el plazo                   | «La inscripción está cerrada.» y se relee
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: toast }));
vi.mock('./useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: false,
    guardar: vi.fn(),
    refrescar: vi.fn(),
  }),
}));
const responder = vi.hoisted(() => vi.fn());
vi.mock('../composition', () => ({
  respondToInvitationUseCase: { execute: (...a) => responder(...a) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useResponderInvitacion · pasado el plazo', () => {
  it('I1: Given el plazo ya pasó, When acepta, Then se dice que está cerrada y se relee', async () => {
    responder.mockRejectedValue(
      Object.assign(new Error('x'), {
        status: 400,
        errorCode: 'ENROLLMENT_DEADLINE_PASSED',
      }),
    );
    const alCambiar = vi.fn();
    const { result } = renderHook(() =>
      useResponderInvitacion({ alAceptar: vi.fn(), alCambiar }),
    );

    // Aceptar pasa antes por la barra general (barras por campo)
    act(() => {
      result.current.aceptar('inv-1');
    });
    await act(async () => {
      result.current.preguntaDeLaBarra.onConfirm('YELLOW', null);
    });

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'errors.enrollmentDeadlinePassed',
      ),
    );
    expect(alCambiar).toHaveBeenCalled();
  });
});
