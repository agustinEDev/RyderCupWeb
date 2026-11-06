import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

/**
 * La página del enlace que confirma un correo nuevo (RyderCupAm #749). Va dentro de
 * la sesión (ProtectedRoute): aquí ya hay sesión.
 *
 *   #   El backend responde              | Se ve
 *   ----|----------------------------------|---------------------------------------
 *   P1  200 con el usuario               | confirmEmailChange.done con el correo nuevo
 *   P2  400 EMAIL_CHANGE_EXPIRED         | confirmEmailChange.expired
 *   P3  400 EMAIL_CHANGE_INVALID         | confirmEmailChange.invalid
 *   P4  409 EMAIL_ALREADY_IN_USE         | confirmEmailChange.inUse
 *   P5  sin token en el enlace           | confirmEmailChange.invalid, sin llamar
 *   P6  confirmado                       | la sesión se recarga (el correo de la cabecera)
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, opciones) => (opciones?.email ? `${clave}:${opciones.email}` : clave),
    i18n: { language: 'es' },
  }),
}));
const refetch = vi.fn();
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ refetch }) }));
vi.mock('../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../composition', () => ({ confirmEmailChangeUseCase: { execute: vi.fn() } }));

const { confirmEmailChangeUseCase } = await import('../composition');
const { default: ConfirmEmailChange } = await import('./ConfirmEmailChange');

const abrir = (query) =>
  render(
    <MemoryRouter initialEntries={[`/confirm-email-change${query}`]}>
      <Routes>
        <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
      </Routes>
    </MemoryRouter>
  );

const rechazo = (status, errorCode) =>
  Object.assign(new Error('rechazado'), { status, errorCode });

describe('ConfirmEmailChange', () => {
  afterEach(() => vi.clearAllMocks());

  it('P1/P6: confirmado: el correo nuevo, y la sesión se recarga', async () => {
    confirmEmailChangeUseCase.execute.mockResolvedValue({ email: 'ana@trabajo.com' });
    abrir('?token=tok-1');
    expect(await screen.findByText('confirmEmailChange.done:ana@trabajo.com')).toBeInTheDocument();
    expect(confirmEmailChangeUseCase.execute).toHaveBeenCalledWith('tok-1');
    expect(refetch).toHaveBeenCalled();
  });

  it.each([
    ['P2', 400, 'EMAIL_CHANGE_EXPIRED', 'confirmEmailChange.expired'],
    ['P3', 400, 'EMAIL_CHANGE_INVALID', 'confirmEmailChange.invalid'],
    ['P4', 409, 'EMAIL_ALREADY_IN_USE', 'confirmEmailChange.inUse'],
  ])('%s: %s %s', async (_n, status, codigo, texto) => {
    confirmEmailChangeUseCase.execute.mockRejectedValue(rechazo(status, codigo));
    abrir('?token=tok-1');
    expect(await screen.findByText(texto)).toBeInTheDocument();
  });

  it('P5: sin token no se llama al backend', async () => {
    abrir('');
    expect(await screen.findByText('confirmEmailChange.invalid')).toBeInTheDocument();
    expect(confirmEmailChangeUseCase.execute).not.toHaveBeenCalled();
  });
});
