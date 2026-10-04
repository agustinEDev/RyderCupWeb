import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * Como en ForgotPassword: el 429 se reconocía por «Rate limit» en el texto, y
 * desde que `apiRequest` lo traduce (4 oct 2026) se reconoce por el `status`.
 */
const restablecer = vi.fn();
const toastError = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
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
});
