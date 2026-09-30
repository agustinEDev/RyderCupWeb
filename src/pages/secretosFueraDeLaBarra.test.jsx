import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * Las tres páginas que reciben un secreto en la URL lo quitan de la barra en
 * cuanto lo leen, y lo siguen usando (revisión del 30 sep 2026).
 *
 *   #   página                         | la barra        | y el secreto
 *   ----|------------------------------|-----------------|--------------------------
 *   P1  restablecer contraseña (ruta)  | sin el token    | se valida igual
 *   P2  verificar el correo (query)    | sin el token    | se verifica igual
 *   P3  la vuelta de Google            | sin code/state  | se inicia sesión igual
 *   P4  recargar restablecer contraseña | sin token      | se recupera del historial
 *   P5  recargar verificar el correo   | sin token       | se recupera del historial
 *
 * Con BrowserRouter, el de producción, que es el que lee la barra: con un
 * MemoryRouter pasarían aunque el router perdiera el token al limpiarla.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../hooks/useAuthContext', () => ({ useAuthContext: () => ({ login: vi.fn() }) }));
vi.mock('../utils/googleOAuth', () => ({ verifyOAuthState: () => ({ flow: 'login', valid: true }) }));
// Pendientes: lo que importa es con qué se llaman, no lo que pasa después
const pendiente = () => new Promise(() => {});
vi.mock('../composition', () => ({
  validateResetTokenUseCase: { execute: vi.fn(() => pendiente()) },
  resetPasswordUseCase: { execute: vi.fn() },
  verifyEmailUseCase: { execute: vi.fn(() => pendiente()) },
  googleLoginUseCase: { execute: vi.fn(() => pendiente()) },
  linkGoogleAccountUseCase: { execute: vi.fn(() => pendiente()) },
}));

const { validateResetTokenUseCase, verifyEmailUseCase, googleLoginUseCase } = await import(
  '../composition'
);
const { default: ResetPassword } = await import('./ResetPassword');
const { default: VerifyEmail } = await import('./VerifyEmail');
const { default: GoogleCallback } = await import('./GoogleCallback');

const abrir = (url, ruta, Pagina, estado = null) => {
  window.history.replaceState(estado, '', url);
  render(
    <BrowserRouter>
      <Routes>
        <Route path={ruta} element={<Pagina />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('los secretos salen de la barra', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('P1: restablecer contraseña', async () => {
    abrir('/reset-password/abc123', '/reset-password/:token', ResetPassword);
    await waitFor(() => expect(validateResetTokenUseCase.execute).toHaveBeenCalledWith('abc123'));
    expect(window.location.href).not.toContain('abc123');
  });

  it('P2: verificar el correo', async () => {
    abrir('/verify-email?token=abc123', '/verify-email', VerifyEmail);
    await waitFor(() => expect(verifyEmailUseCase.execute).toHaveBeenCalledWith('abc123'));
    expect(window.location.href).not.toContain('abc123');
  });

  it('P3: la vuelta de Google', async () => {
    abrir('/auth/google/callback?code=abc123&state=nonce456', '/auth/google/callback', GoogleCallback);
    await waitFor(() => expect(googleLoginUseCase.execute).toHaveBeenCalledWith('abc123'));
    expect(window.location.href).not.toContain('abc123');
    expect(window.location.href).not.toContain('nonce456');
  });

  it('P4: al recargar restablecer contraseña, recupera el token del historial', async () => {
    abrir('/reset-password/abc123', '/reset-password/:token', ResetPassword);
    await waitFor(() => expect(validateResetTokenUseCase.execute).toHaveBeenCalledWith('abc123'));
    const estado = window.history.state;
    cleanup();
    vi.clearAllMocks();

    // La recarga: la barra ya limpia y el estado del historial, que el navegador conserva
    abrir('/reset-password', '/reset-password', ResetPassword, estado);
    await waitFor(() => expect(validateResetTokenUseCase.execute).toHaveBeenCalledWith('abc123'));
  });

  it('P5: al recargar verificar el correo, recupera el token del historial', async () => {
    abrir('/verify-email?token=abc123', '/verify-email', VerifyEmail);
    await waitFor(() => expect(verifyEmailUseCase.execute).toHaveBeenCalledWith('abc123'));
    const estado = window.history.state;
    cleanup();
    vi.clearAllMocks();

    abrir('/verify-email', '/verify-email', VerifyEmail, estado);
    await waitFor(() => expect(verifyEmailUseCase.execute).toHaveBeenCalledWith('abc123'));
  });
});
