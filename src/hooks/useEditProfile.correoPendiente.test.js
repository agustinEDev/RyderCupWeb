import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditProfile } from './useEditProfile';

/**
 * El correo nuevo queda pendiente hasta confirmarlo (RyderCupAm #749).
 *
 *   #   Caso                         | Se ve
 *   ----|------------------------------|---------------------------------------------
 *   H1  pedir un correo nuevo        | toasts.emailChangePending con el nuevo y el actual
 *   H2  solo la contraseña           | toasts.securityUpdated, como siempre
 *   H3  anular el pendiente          | cancelEmailChangeUseCase, recarga y emailChangeCancelled
 *   H4  anular falla                 | toasts.failedToCancelEmailChange
 *   H5  mientras anula               | isCancellingEmail (el botón, desactivado)
 */
vi.mock('react-i18next', () => ({
  // Con los valores: así se ve que el texto lleva los dos correos
  useTranslation: () => ({
    t: (clave, o) => (o?.nuevo ? `${clave}:${o.nuevo}:${o.actual}` : clave),
    i18n: { language: 'es' },
  }),
}));
vi.mock('../composition', () => ({
  updateUserProfileUseCase: { execute: vi.fn() },
  updateUserSecurityUseCase: { execute: vi.fn() },
  updateManualHandicapUseCase: { execute: vi.fn() },
  updateRfegHandicapUseCase: { execute: vi.fn() },
  cancelEmailChangeUseCase: { execute: vi.fn() },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('./useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
  customToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));

import * as composition from '../composition';
import { useAuth } from './useAuth';
import toast from '../utils/toast';

const ANA = { id: '1', first_name: 'Ana', last_name: 'Lopez', email: 'ana@gmail.com', handicap: 10 };

describe('useEditProfile · correo pendiente', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: ANA, loading: false, error: null, refetch });
    composition.updateUserSecurityUseCase.execute.mockResolvedValue({});
  });

  const pide = async (cambios) => {
    const { result } = renderHook(() => useEditProfile());
    await act(async () => {});
    act(() => {
      result.current.handleInputChange({ target: { name: 'currentPassword', value: 'Actual#2026clave' } });
      for (const [name, value] of Object.entries(cambios)) {
        result.current.handleInputChange({ target: { name, value } });
      }
    });
    await act(async () => {
      await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
    });
    return result;
  };

  it('H1: pedir un correo nuevo dice que queda pendiente', async () => {
    await pide({ email: 'ana@trabajo.com' });
    expect(toast.success).toHaveBeenCalledWith(
      'toasts.emailChangePending:ana@trabajo.com:ana@gmail.com',
      { duration: 8000 }
    );
  });

  it('H2: solo la contraseña, el aviso de siempre', async () => {
    await pide({ newPassword: 'Nueva#2026clave', confirmPassword: 'Nueva#2026clave' });
    expect(toast.success).toHaveBeenCalledWith('toasts.securityUpdated');
  });

  it('H3: anular el pendiente', async () => {
    composition.cancelEmailChangeUseCase.execute.mockResolvedValue({});
    const { result } = renderHook(() => useEditProfile());
    await act(async () => {});
    await act(async () => {
      await result.current.handleCancelEmailChange();
    });
    expect(composition.cancelEmailChangeUseCase.execute).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('toasts.emailChangeCancelled');
  });

  it('H4: si anular falla, su propio aviso', async () => {
    composition.cancelEmailChangeUseCase.execute.mockRejectedValue(new Error('sin red'));
    const { result } = renderHook(() => useEditProfile());
    await act(async () => {});
    await act(async () => {
      await result.current.handleCancelEmailChange();
    });
    expect(toast.error).toHaveBeenCalledWith('toasts.failedToCancelEmailChange');
  });

  it('H5: mientras anula, isCancellingEmail; un segundo toque no repite', async () => {
    let termina;
    composition.cancelEmailChangeUseCase.execute.mockReturnValue(new Promise((r) => { termina = r; }));
    const { result } = renderHook(() => useEditProfile());
    await act(async () => {});
    let primera;
    act(() => {
      primera = result.current.handleCancelEmailChange();
    });
    expect(result.current.isCancellingEmail).toBe(true);
    await act(async () => {
      await result.current.handleCancelEmailChange();
    });
    expect(composition.cancelEmailChangeUseCase.execute).toHaveBeenCalledTimes(1);
    await act(async () => {
      termina({});
      await primera;
    });
    expect(result.current.isCancellingEmail).toBe(false);
  });
});
