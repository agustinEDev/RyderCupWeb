import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * Sin red el usuario sale de la copia del dispositivo, sin hándicap, correo ni género
 * (fase 3, FE-06). Editar el perfil espera a que el servidor confirme la sesión: todo
 * lo de esa pantalla necesita red, y rellenar el formulario con huecos invitaba a
 * guardar datos falsos. Antes, `authUser.handicap.toString()` reventaba con la copia.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('../composition', () => ({
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock('../utils/googleOAuth', () => ({ buildGoogleOAuthUrl: vi.fn() }));
const sesion = vi.hoisted(() => ({
  user: null,
  sinConfirmar: false,
  refetch: () => {},
}));
vi.mock('./useAuth', () => ({ useAuth: () => sesion }));

const { useEditProfile } = await import('./useEditProfile');

describe('useEditProfile · sin conexión (fase 3)', () => {
  beforeEach(() => {
    sesion.user = null;
    sesion.sinConfirmar = false;
  });

  it('con la copia reducida no revienta ni rellena el formulario: espera', async () => {
    const consola = vi.spyOn(globalThis.console, 'error');
    sesion.user = {
      id: 'u-1',
      first_name: 'Ana',
      last_name: 'Prueba',
      email_verified: true,
    };
    sesion.sinConfirmar = true;

    const { result } = renderHook(() => useEditProfile());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sinConfirmar).toBe(true);
    expect(result.current.user).toBeNull();
    expect(consola).not.toHaveBeenCalled();
    consola.mockRestore();
  });

  it('con red y sin el campo hándicap, el formulario lo deja vacío sin reventar', async () => {
    const consola = vi.spyOn(globalThis.console, 'error');
    sesion.user = {
      id: 'u-1',
      first_name: 'Ana',
      last_name: 'Prueba',
      email: 'a@b.c',
    };

    const { result } = renderHook(() => useEditProfile());

    await waitFor(() => expect(result.current.formData.email).toBe('a@b.c'));
    expect(result.current.formData.handicap).toBe('');
    expect(consola).not.toHaveBeenCalled();
    consola.mockRestore();
  });
});
