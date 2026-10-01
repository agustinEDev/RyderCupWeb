import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

/**
 * FE #775: un enlace de restablecimiento caducado o inválido enseñaba el
 * formulario de contraseña nueva. La API responde a ese token con 200 y
 * { valid: false }, y el caso de uso daba por bueno cualquier 200. El usuario
 * solo se enteraba al enviar la contraseña.
 *
 * Se monta la página con el caso de uso REAL y solo el repositorio simulado,
 * que contesta como la API: así se prueba la cadena entera.
 *
 *   #   la API contesta              | la página
 *   ----|-----------------------------|----------------------------------------
 *   L1  200 { valid: false, message } | «enlace no válido», su texto traducido y pedir otro
 *   L2  200 { valid: true }           | el formulario (lo que ya hacía)
 */
const repositorio = vi.hoisted(() => ({ validateResetToken: vi.fn(), resetPassword: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('../composition', async () => {
  const { default: ValidateResetTokenUseCase } = await import(
    '../application/use_cases/user/ValidateResetTokenUseCase'
  );
  return {
    validateResetTokenUseCase: new ValidateResetTokenUseCase({ authRepository: repositorio }),
    resetPasswordUseCase: { execute: vi.fn() },
  };
});

const { default: ResetPassword } = await import('./ResetPassword');

const abrir = (token) => {
  window.history.replaceState(null, '', `/reset-password/${token}`);
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('ResetPassword · enlace caducado o inválido (FE #775)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('L1: valid:false enseña el aviso y no el formulario', async () => {
    repositorio.validateResetToken.mockResolvedValue({
      valid: false,
      message: 'Token de reseteo inválido o expirado. Solicita un nuevo enlace.',
    });
    abrir('a'.repeat(48));

    expect(await screen.findByText('resetPassword.invalidTokenTitle')).toBeInTheDocument();
    // El texto propio y traducido, no el del backend (que viene en español)
    expect(screen.getByText('resetPassword.tokenInvalidMessage')).toBeInTheDocument();
    expect(
      screen.queryByText('Token de reseteo inválido o expirado. Solicita un nuevo enlace.')
    ).toBeNull();
    expect(screen.getByText('resetPassword.requestNewLink')).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('L2: valid:true enseña el formulario', async () => {
    repositorio.validateResetToken.mockResolvedValue({ valid: true, message: 'ok' });
    abrir('b'.repeat(48));

    await vi.waitFor(() => expect(document.querySelector('input[type="password"]')).not.toBeNull());
    expect(screen.queryByText('resetPassword.invalidTokenTitle')).toBeNull();
  });
});
