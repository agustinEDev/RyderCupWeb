import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * Como en ForgotPassword: el 429 se reconocía por «Rate limit» en el texto, y
 * desde que `apiRequest` lo traduce (4 oct 2026) se reconoce por el `status`.
 */
const restablecer = vi.fn();
const toastError = vi.fn();
// `t` estable, como la de verdad: una nueva en cada render volvía a lanzar la
// validación del token (depende de `t`) y deshacía el paso a «enlace inválido»
const { tEstable } = vi.hoisted(() => ({ tEstable: (clave) => clave }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tEstable, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: (...a) => toastError(...a), success: vi.fn(), info: vi.fn() } }));
vi.mock('../composition', () => ({
  validateResetTokenUseCase: { execute: vi.fn().mockResolvedValue({ valid: true }) },
  resetPasswordUseCase: { execute: (...a) => restablecer(...a) },
}));

const { default: ResetPassword } = await import('./ResetPassword');

const enviarContrasena = async () => {
  window.history.replaceState(null, '', `/reset-password/${'c'.repeat(48)}`);
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
  await vi.waitFor(() => expect(document.querySelectorAll('input[type="password"]').length).toBe(2));
  const [nueva, repetida] = document.querySelectorAll('input[type="password"]');
  fireEvent.change(nueva, { target: { name: nueva.name, value: 'Contrasena-Segura-123!' } });
  fireEvent.change(repetida, { target: { name: repetida.name, value: 'Contrasena-Segura-123!' } });
  fireEvent.submit(nueva.closest('form'));
};

describe('ResetPassword · demasiados intentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('P1: un 429 enseña el aviso propio de la pantalla', async () => {
    restablecer.mockRejectedValue(
      Object.assign(new Error('t(common:demasiadasPeticiones)'), { status: 429 })
    );

    await enviarContrasena();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('resetPassword.rateLimitError', expect.anything())
    );
  });

  it('BE #519: una contraseña común se dice con su clave, no con el texto en español', async () => {
    restablecer.mockRejectedValue(
      Object.assign(new Error('Esta contraseña es demasiado común…'), {
        status: 400,
        errorCode: 'PASSWORD_TOO_COMMON',
      })
    );

    await enviarContrasena();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('validation.passwordCommon', expect.anything())
    );
  });

  it('BE #519: un token inválido se reconoce por su código, no por el texto en inglés', async () => {
    restablecer.mockRejectedValue(
      Object.assign(new Error('Token de reseteo inválido o expirado'), {
        status: 400,
        errorCode: 'RESET_TOKEN_INVALID',
      })
    );

    await enviarContrasena();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('resetPassword.tokenInvalidMessage', expect.anything())
    );
    // Y la pantalla pasa a la de enlace inválido, en vez de dejar el formulario
    await waitFor(() =>
      expect(document.body.textContent).toContain('resetPassword.invalidTokenTitle')
    );
  });
});
