import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponderInvitacion } from './useResponderInvitacion';

/**
 * Aceptar una invitación que no puede entrar ahora (15 nov 2026; RyderCupAm
 * B-02): se dice por qué, con el texto de la app, y se relee la lista.
 *
 *   caso                                  | qué se dice
 *   --------------------------------------|----------------------------------------
 *   I1 409 INVITATION_ON_HOLD             | «En lista de espera: la inscripción está cerrada…»
 *   I2 409 DRAFT_IN_PROGRESS              | «Ahora mismo se está haciendo el draft…»
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

describe('useResponderInvitacion · no puede entrar ahora', () => {
  it.each([
    ['I1', 'INVITATION_ON_HOLD', 'errors.onHold'],
    ['I2', 'DRAFT_IN_PROGRESS', 'errors.draftInProgress'],
  ])(
    '%s: Given %s, When acepta, Then se dice por qué y se relee',
    async (_, errorCode, texto) => {
      responder.mockRejectedValue(
        Object.assign(new Error('x'), { status: 409, errorCode }),
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

      await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(texto));
      expect(alCambiar).toHaveBeenCalled();
    },
  );
});
