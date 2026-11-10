/**
 * Vincular Google pide la contraseña actual (RyderCupAm #753, punto 2).
 *
 *   H1 con contraseña: «Vincular» abre la ventana y aún no va a Google
 *   H2 sin contraseña (solo Google): va directo, como hasta ahora
 *   H3 contraseña correcta: se va a Google
 *   H4 incorrecta: lo dice en la ventana, sin ir a Google
 *   H5 demasiados intentos: lo dice
 *   H6 otro fallo: un aviso general
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditProfile } from './useEditProfile';
import * as composition from '../composition';
import * as useAuthHook from './useAuth';

vi.mock('../utils/googleOAuth', () => ({ buildGoogleOAuthUrl: vi.fn(() => 'https://google/vincular') }));
import * as googleOAuth from '../utils/googleOAuth';

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

describe('useEditProfile · la contraseña antes de vincular Google', () => {
  const usuario = (hasPassword) => ({
    id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    country_code: 'ES',
    has_password: hasPassword,
    auth_providers: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { href: '/profile/edit' });
    composition.fetchCountriesUseCase.execute.mockResolvedValue([{ code: 'ES', name: 'Spain' }]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const monta = async (hasPassword = true) => {
    useAuthHook.useAuth.mockReturnValue({ user: usuario(hasPassword), refetch: vi.fn() });
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  };

  it('H1: con contraseña, abre la ventana y no va a Google', async () => {
    const result = await monta(true);

    act(() => result.current.handleLinkGoogle());

    expect(result.current.isGooglePasswordOpen).toBe(true);
    expect(globalThis.location.href).toBe('/profile/edit');
  });

  it('H2: sin contraseña, va directo a Google', async () => {
    const result = await monta(false);

    // La URL se espera: el reto de PKCE es asíncrono (fase 3)
    await act(async () => result.current.handleLinkGoogle());

    expect(result.current.isGooglePasswordOpen).toBe(false);
    expect(globalThis.location.href).toBe('https://google/vincular');
  });

  it('H2b: sin contraseña, si no se puede montar la ida a Google, lo dice (fase 3)', async () => {
    const toast = (await import('../utils/toast')).default;
    const consola = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    const result = await monta(false);
    googleOAuth.buildGoogleOAuthUrl.mockRejectedValueOnce(new Error('sin crypto.subtle'));

    await act(async () => result.current.handleLinkGoogle());

    expect(toast.error).toHaveBeenCalledWith('auth:google.genericError');
    expect(globalThis.location.href).toBe('/profile/edit');
    consola.mockRestore();
  });

  it('H3: con la contraseña correcta, va a Google', async () => {
    const result = await monta(true);
    act(() => result.current.handleLinkGoogle());
    composition.reauthenticateUseCase.execute.mockResolvedValue({ expiresIn: 300 });

    let fallo;
    await act(async () => {
      fallo = await result.current.confirmaContrasenaParaGoogle('Actual123!');
    });

    expect(composition.reauthenticateUseCase.execute).toHaveBeenCalledWith('Actual123!');
    expect(fallo).toBeNull();
    expect(globalThis.location.href).toBe('https://google/vincular');
  });

  it('H7: si se cancela mientras comprueba, no va a Google aunque la contraseña valga', async () => {
    const result = await monta(true);
    let suelta;
    composition.reauthenticateUseCase.execute.mockReturnValue(new Promise((r) => { suelta = r; }));
    act(() => result.current.handleLinkGoogle());

    let pendiente;
    act(() => {
      pendiente = result.current.confirmaContrasenaParaGoogle('Actual123!');
    });
    act(() => result.current.cierraContrasenaParaGoogle());
    await act(async () => {
      suelta({ expiresIn: 300 });
      await pendiente;
    });

    expect(globalThis.location.href).toBe('/profile/edit');
  });

  it('H8: si no se puede montar la ida a Google, lo dice en vez de quedarse comprobando', async () => {
    const result = await monta(true);
    composition.reauthenticateUseCase.execute.mockResolvedValue({ expiresIn: 300 });
    googleOAuth.buildGoogleOAuthUrl.mockImplementationOnce(() => {
      throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is not configured');
    });
    act(() => result.current.handleLinkGoogle());

    let fallo;
    await act(async () => {
      fallo = await result.current.confirmaContrasenaParaGoogle('Actual123!');
    });

    expect(fallo).toBe('auth:google.genericError');
  });

  it.each([
    ['H4', 'CURRENT_PASSWORD_INCORRECT', 'edit.linkedAccounts.wrongPassword'],
    ['H5', 'TOO_MANY_SECURITY_CHANGES', 'toasts.tooManySecurityChanges'],
    ['H6', undefined, 'edit.linkedAccounts.passwordCheckFailed'],
  ])('%s: %s no va a Google y dice por qué', async (_caso, codigo, clave) => {
    const result = await monta(true);
    composition.reauthenticateUseCase.execute.mockRejectedValue(
      Object.assign(new Error('no'), { errorCode: codigo })
    );

    let fallo;
    await act(async () => {
      fallo = await result.current.confirmaContrasenaParaGoogle('Mala123!');
    });

    expect(fallo).toBe(clave);
    expect(globalThis.location.href).toBe('/profile/edit');
  });
});
