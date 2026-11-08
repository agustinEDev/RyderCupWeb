/**
 * Desvincular Google pide la contraseña actual, como vincularlo (tabla D aprobada por
 * Agustín el 8 nov 2026).
 *
 *   D6 «Desvincular» abre la ventana sin desvincular; con la contraseña correcta,
 *      desvincula, recarga la sesión y avisa
 *   D7 contraseña incorrecta o demasiados intentos: lo dice en la ventana, sin desvincular
 *   D8 si se cierra la ventana mientras comprueba, no desvincula
 *   D9 el desvincular dice REAUTHENTICATION_REQUIRED: pide confirmar otra vez en la
 *      ventana; otro fallo, el aviso de siempre
 *   y vincular después sigue yendo a Google
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditProfile } from './useEditProfile';
import * as composition from '../composition';
import * as useAuthHook from './useAuth';
import customToast from '../utils/toast';

vi.mock('../utils/googleOAuth', () => ({ buildGoogleOAuthUrl: vi.fn(() => 'https://google/vincular') }));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
}));

// Mock dependencies
vi.mock('../composition', () => ({
  reauthenticateUseCase: {
    execute: vi.fn(),
  },
  unlinkGoogleAccountUseCase: {
    execute: vi.fn(),
  },
  updateUserSecurityUseCase: {
    execute: vi.fn(),
  },
  fetchCountriesUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('useEditProfile · la contraseña antes de desvincular Google', () => {
  const usuario = {
    id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    country_code: 'ES',
    has_password: true,
    auth_providers: ['google'],
    handicap: null,
  };
  let refetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { href: '/profile/edit' });
    composition.fetchCountriesUseCase.execute.mockResolvedValue([{ code: 'ES', name: 'Spain' }]);
    composition.reauthenticateUseCase.execute.mockResolvedValue({ expiresIn: 300 });
    composition.unlinkGoogleAccountUseCase.execute.mockResolvedValue({ provider: 'google' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const monta = async () => {
    refetch = vi.fn().mockResolvedValue(undefined);
    useAuthHook.useAuth.mockReturnValue({ user: usuario, refetch });
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  };

  const confirma = async (result, clave = 'Actual123!') => {
    let fallo;
    await act(async () => {
      fallo = await result.current.confirmaContrasenaParaGoogle(clave);
    });
    return fallo;
  };

  it('D6: «Desvincular» abre la ventana para desvincular, sin desvincular aún', async () => {
    const result = await monta();

    act(() => result.current.handleUnlinkGoogle());

    expect(result.current.isGooglePasswordOpen).toBe(true);
    expect(result.current.accionDeGoogle).toBe('desvincular');
    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it('D6: con la contraseña correcta, comprueba, desvincula, recarga y avisa', async () => {
    const result = await monta();
    act(() => result.current.handleUnlinkGoogle());

    const fallo = await confirma(result);

    expect(fallo).toBeNull();
    expect(composition.reauthenticateUseCase.execute).toHaveBeenCalledWith('Actual123!');
    expect(composition.unlinkGoogleAccountUseCase.execute).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalledWith('edit.linkedAccounts.unlinkSuccess');
    expect(globalThis.location.href).toBe('/profile/edit');
  });

  it.each([
    ['CURRENT_PASSWORD_INCORRECT', 'edit.linkedAccounts.wrongPassword'],
    ['TOO_MANY_SECURITY_CHANGES', 'toasts.tooManySecurityChanges'],
  ])('D7: %s lo dice en la ventana y no desvincula', async (codigo, clave) => {
    const result = await monta();
    act(() => result.current.handleUnlinkGoogle());
    composition.reauthenticateUseCase.execute.mockRejectedValue(
      Object.assign(new Error('no'), { errorCode: codigo })
    );

    expect(await confirma(result, 'Mala123!')).toBe(clave);
    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it('D8: si se cierra la ventana mientras comprueba, no desvincula', async () => {
    const result = await monta();
    let suelta;
    composition.reauthenticateUseCase.execute.mockReturnValue(new Promise((r) => { suelta = r; }));
    act(() => result.current.handleUnlinkGoogle());

    let pendiente;
    act(() => {
      pendiente = result.current.confirmaContrasenaParaGoogle('Actual123!');
    });
    act(() => result.current.cierraContrasenaParaGoogle());
    await act(async () => {
      suelta({ expiresIn: 300 });
      await pendiente;
    });

    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it('D9: si el desvincular pide confirmar otra vez, lo dice en la ventana, sin aviso', async () => {
    const result = await monta();
    act(() => result.current.handleUnlinkGoogle());
    composition.unlinkGoogleAccountUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Enter your current password first'), {
        errorCode: 'REAUTHENTICATION_REQUIRED',
      })
    );

    expect(await confirma(result)).toBe('edit.linkedAccounts.reauthExpired');
    expect(customToast.error).not.toHaveBeenCalled();
    expect(customToast.success).not.toHaveBeenCalled();
  });

  it('D9: otro fallo del desvincular, el aviso de siempre y la ventana se cierra', async () => {
    const result = await monta();
    act(() => result.current.handleUnlinkGoogle());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    composition.unlinkGoogleAccountUseCase.execute.mockRejectedValue(new Error('Server error'));

    expect(await confirma(result)).toBeNull();
    expect(customToast.error).toHaveBeenCalledWith('Server error');
    console.error.mockRestore();
  });

  it('mientras desvincula, el botón lo dice', async () => {
    const result = await monta();
    let suelta;
    composition.unlinkGoogleAccountUseCase.execute.mockReturnValue(new Promise((r) => { suelta = r; }));
    act(() => result.current.handleUnlinkGoogle());

    let pendiente;
    await act(async () => {
      pendiente = result.current.confirmaContrasenaParaGoogle('Actual123!');
    });
    expect(result.current.isUnlinkingGoogle).toBe(true);
    await act(async () => {
      suelta({ provider: 'google' });
      await pendiente;
    });
    expect(result.current.isUnlinkingGoogle).toBe(false);
  });

  it('vincular después de abrir para desvincular sigue yendo a Google', async () => {
    useAuthHook.useAuth.mockReturnValue({
      user: { ...usuario, auth_providers: [] },
      refetch: vi.fn(),
    });
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.handleUnlinkGoogle());
    act(() => result.current.cierraContrasenaParaGoogle());

    act(() => result.current.handleLinkGoogle());
    expect(result.current.accionDeGoogle).toBe('vincular');
    await confirma(result);

    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
    expect(globalThis.location.href).toBe('https://google/vincular');
  });

  it('una comprobación de «Vincular» cancelada no desvincula si luego se abre «Desvincular»', async () => {
    useAuthHook.useAuth.mockReturnValue({ user: usuario, refetch: vi.fn() });
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let suelta;
    composition.reauthenticateUseCase.execute.mockReturnValueOnce(new Promise((r) => { suelta = r; }));

    act(() => result.current.handleLinkGoogle());
    let vieja;
    act(() => {
      vieja = result.current.confirmaContrasenaParaGoogle('Actual123!');
    });
    act(() => result.current.cierraContrasenaParaGoogle());
    act(() => result.current.handleUnlinkGoogle());
    await act(async () => {
      suelta({ expiresIn: 300 });
      await vieja;
    });

    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
    expect(globalThis.location.href).toBe('/profile/edit');
    expect(result.current.isGooglePasswordOpen).toBe(true);
  });

  it('una comprobación de «Desvincular» cancelada no va a Google si luego se abre «Vincular»', async () => {
    useAuthHook.useAuth.mockReturnValue({ user: usuario, refetch: vi.fn() });
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let suelta;
    composition.reauthenticateUseCase.execute.mockReturnValueOnce(new Promise((r) => { suelta = r; }));

    act(() => result.current.handleUnlinkGoogle());
    let vieja;
    act(() => {
      vieja = result.current.confirmaContrasenaParaGoogle('Actual123!');
    });
    act(() => result.current.cierraContrasenaParaGoogle());
    act(() => result.current.handleLinkGoogle());
    await act(async () => {
      suelta({ expiresIn: 300 });
      await vieja;
    });

    expect(globalThis.location.href).toBe('/profile/edit');
    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it('si recargar la sesión falla tras desvincular, avisa del éxito igual', async () => {
    const result = await monta();
    refetch.mockRejectedValue(new Error('red'));
    act(() => result.current.handleUnlinkGoogle());

    expect(await confirma(result)).toBeNull();

    expect(customToast.success).toHaveBeenCalledWith('edit.linkedAccounts.unlinkSuccess');
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('sin contraseña, «Desvincular» no abre una ventana que no se puede completar', async () => {
    useAuthHook.useAuth.mockReturnValue({
      user: { ...usuario, has_password: false },
      refetch: vi.fn(),
    });
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.handleUnlinkGoogle());

    expect(result.current.isGooglePasswordOpen).toBe(false);
  });

  it('una comprobación de «Desvincular» cancelada no desvincula si se vuelve a abrir «Desvincular»', async () => {
    const result = await monta();
    let suelta;
    composition.reauthenticateUseCase.execute.mockReturnValueOnce(new Promise((r) => { suelta = r; }));

    act(() => result.current.handleUnlinkGoogle());
    let vieja;
    act(() => {
      vieja = result.current.confirmaContrasenaParaGoogle('Actual123!');
    });
    act(() => result.current.cierraContrasenaParaGoogle());
    act(() => result.current.handleUnlinkGoogle());
    await act(async () => {
      suelta({ expiresIn: 300 });
      await vieja;
    });

    expect(composition.unlinkGoogleAccountUseCase.execute).not.toHaveBeenCalled();
    expect(customToast.success).not.toHaveBeenCalled();
  });
});
