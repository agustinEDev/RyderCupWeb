import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * Enlace de verificar caducado (fase 3, aprobado por Agustín):
 *
 *   #   caso                                       | se ve / se hace
 *   ----|------------------------------------------|----------------------------------------------
 *   X1  400 VERIFICATION_TOKEN_EXPIRED            | «El enlace ha caducado» y «Enviarme otro enlace»
 *   X2  pulsar el botón                           | POST con el token de la URL; «Si el enlace era
 *                                                 | tuyo…» y el botón desactivado
 *   X3  el reenvío da 429                         | el texto de límite de siempre
 *   X4  el reenvío falla por otra cosa            | el aviso de no se pudo reenviar
 *   X5  inválido o usado (400 sin ese código)     | como hoy: «No se pudo verificar»
 *   X6  el token ya no está en la barra           | se usa el recuperado del historial
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../composition', () => ({
  verifyEmailUseCase: { execute: vi.fn() },
  resendVerificationLinkUseCase: { execute: vi.fn() },
}));

const { verifyEmailUseCase, resendVerificationLinkUseCase } = await import('../composition');
const { default: VerifyEmail } = await import('./VerifyEmail');

const caducado = () =>
  Object.assign(new Error('expired'), { status: 400, errorCode: 'VERIFICATION_TOKEN_EXPIRED' });

const abrir = (url = '/verify-email?token=tok-caducado') => {
  window.history.replaceState(null, '', url);
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Routes>
    </BrowserRouter>
  );
};

const boton = () => screen.findByRole('button', { name: 'verifyEmail.resendLink' }, { timeout: 4000 });

describe('VerifyEmail · enlace caducado (fase 3)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('X1: dice que caducó y ofrece otro', async () => {
    verifyEmailUseCase.execute.mockRejectedValue(caducado());
    abrir();

    expect(await boton()).toBeEnabled();
    expect(screen.getByText('verifyEmail.expiredTitle')).toBeInTheDocument();
    // Como las demás pantallas: el texto debajo y la salida a entrar o al inicio
    expect(screen.getByText('verifyEmail.expiredMessage')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'verifyEmail.goToLogin' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'verifyEmail.goToHome' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('verifyEmail.errorTitle')).not.toBeInTheDocument();
  });

  it('X2: pide otro con el token de la URL y dice el resultado genérico', async () => {
    verifyEmailUseCase.execute.mockRejectedValue(caducado());
    resendVerificationLinkUseCase.execute.mockResolvedValue(undefined);
    abrir();

    fireEvent.click(await boton());

    expect(await screen.findByText('verifyEmail.resendLinkSent')).toBeInTheDocument();
    expect(resendVerificationLinkUseCase.execute).toHaveBeenCalledWith('tok-caducado');
    expect(screen.getByRole('button', { name: 'verifyEmail.resendLink' })).toBeDisabled();
  });

  it('X3: 429 → el texto de límite de siempre', async () => {
    verifyEmailUseCase.execute.mockRejectedValue(caducado());
    resendVerificationLinkUseCase.execute.mockRejectedValue(
      Object.assign(new Error('common:demasiadasPeticiones'), { status: 429 })
    );
    abrir();

    fireEvent.click(await boton());

    expect(await screen.findByText('common:demasiadasPeticiones')).toBeInTheDocument();
    expect(screen.queryByText('verifyEmail.resendLinkSent')).not.toBeInTheDocument();
  });

  it('X4: otro fallo → no se pudo reenviar', async () => {
    const consola = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    verifyEmailUseCase.execute.mockRejectedValue(caducado());
    resendVerificationLinkUseCase.execute.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }));
    abrir();

    fireEvent.click(await boton());

    expect(await screen.findByText('emailVerification.failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'verifyEmail.resendLink' })).toBeEnabled();
    consola.mockRestore();
  });

  it('X5: inválido o usado: como hoy', async () => {
    const consola = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    verifyEmailUseCase.execute.mockRejectedValue(Object.assign(new Error('Token inválido'), { status: 400 }));
    abrir();

    expect(await screen.findByText('verifyEmail.errorTitle', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'verifyEmail.resendLink' })).not.toBeInTheDocument();
    consola.mockRestore();
  });

  it('X6: con el token ya fuera de la barra, usa el del historial', async () => {
    verifyEmailUseCase.execute.mockRejectedValue(caducado());
    resendVerificationLinkUseCase.execute.mockResolvedValue(undefined);
    abrir();

    const elBoton = await boton();
    // La página quitó el token de la barra al montar
    expect(window.location.search).not.toContain('tok-caducado');
    fireEvent.click(elBoton);

    await waitFor(() => expect(resendVerificationLinkUseCase.execute).toHaveBeenCalledWith('tok-caducado'));
  });
});

describe('Textos del enlace de verificar (revisión de la fase 3)', () => {
  it.each([
    ['es', /caducad/i],
    ['en', /expired/i],
  ])('(%s) el error genérico ya no habla de caducados: tienen su pantalla', async (idioma, caducado) => {
    const textos = (await import(`../i18n/locales/${idioma}/auth.json`)).default;
    expect(textos.verifyEmail.errorMessage).not.toMatch(caducado);
    expect(textos.verifyEmail.expiredMessage).toBeTruthy();
  });
});
