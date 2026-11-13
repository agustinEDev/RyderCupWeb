import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Sin el correo verificado, el backend no enseña las invitaciones enviadas a esa
 * dirección (fase 3, BE-3). La página lo dice, sin número, con el mismo botón de
 * reenviar que el aviso de verificar del panel.
 *
 *   V1 sin verificar                | el aviso, sin número, y «Reenviar correo de verificación»
 *   V2 pulsar reenviar              | resend-verification con su correo; «enviado»
 *   V3 el reenvío falla             | el texto de fallo de siempre
 *   V4 verificado                   | sin aviso
 *   V5 sin conexión (copia sin correo) | el aviso, sin botón: no hay a qué correo mandarlo
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
    i18n: { language: 'es' },
    ready: true,
  }),
}));
const sesion = { user: null, loading: false };
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => sesion }));
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => null }));
vi.mock('../../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: false,
    guardar: vi.fn(),
    refrescar: vi.fn(),
  }),
}));
const reenviar = vi.fn();
vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: {
    execute: vi.fn().mockResolvedValue({ invitations: [], totalCount: 0 }),
  },
  respondToInvitationUseCase: { execute: vi.fn() },
  resendVerificationEmailUseCase: { execute: (...a) => reenviar(...a) },
}));
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { default: MyInvitationsPage } = await import('./MyInvitationsPage');

const USUARIO = {
  id: 'u-1',
  first_name: 'Ana',
  last_name: 'Prueba',
  email: 'ana@example.com',
};
const pintar = () =>
  render(
    <MemoryRouter>
      <MyInvitationsPage />
    </MemoryRouter>,
  );

describe('MyInvitationsPage · sin el correo verificado (fase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('V1: avisa, sin número, con el botón de reenviar', async () => {
    sesion.user = { ...USUARIO, email_verified: false };
    pintar();

    const aviso = await screen.findByTestId('aviso-verificar-invitaciones');
    expect(aviso).toHaveTextContent('player.verifyEmailNotice');
    expect(aviso.textContent).not.toMatch(/\d|count/);
    expect(
      screen.getByRole('button', { name: 'emailVerification.resend' }),
    ).toBeEnabled();
  });

  it('V2: reenviar pide el correo de verificación de su dirección', async () => {
    sesion.user = { ...USUARIO, email_verified: false };
    reenviar.mockResolvedValue({ message: 'ok' });
    pintar();

    fireEvent.click(
      await screen.findByRole('button', { name: 'emailVerification.resend' }),
    );

    expect(
      await screen.findByText('emailVerification.sent'),
    ).toBeInTheDocument();
    expect(reenviar).toHaveBeenCalledWith('ana@example.com');
  });

  it('V3: si falla, el texto de fallo de siempre', async () => {
    const consola = vi
      .spyOn(globalThis.console, 'error')
      .mockImplementation(() => {});
    sesion.user = { ...USUARIO, email_verified: false };
    reenviar.mockRejectedValue(new Error('x'));
    pintar();

    fireEvent.click(
      await screen.findByRole('button', { name: 'emailVerification.resend' }),
    );

    expect(
      await screen.findByText('emailVerification.failed'),
    ).toBeInTheDocument();
    consola.mockRestore();
  });

  it('V4: verificado, sin aviso', async () => {
    sesion.user = { ...USUARIO, email_verified: true };
    pintar();

    expect(await screen.findByText('noInvitations')).toBeInTheDocument();
    expect(
      screen.queryByTestId('aviso-verificar-invitaciones'),
    ).not.toBeInTheDocument();
  });

  it('V5: sin conexión, con la copia sin correo: el aviso sin botón', async () => {
    sesion.user = {
      id: 'u-1',
      first_name: 'Ana',
      last_name: 'Prueba',
      email_verified: false,
    };
    pintar();

    expect(
      await screen.findByTestId('aviso-verificar-invitaciones'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'emailVerification.resend' }),
    ).not.toBeInTheDocument();
  });
});
