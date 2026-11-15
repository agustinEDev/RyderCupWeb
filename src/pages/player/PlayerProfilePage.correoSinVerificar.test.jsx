import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PlayerProfilePage from './PlayerProfilePage';

/**
 * Sin el correo verificado no se pide amistad (B-17 de la auditoría de la fase 6): el
 * aviso con el botón de reenviar, en vez de la petición; y si la API lo dice igual.
 */

const sesion = vi.hoisted(() => ({
  user: { id: 'me', email: 'yo@x.test' },
  // Lo que contesta el servidor al volver a preguntar
  fresco: null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: sesion.user,
    loading: false,
    refetch: () => Promise.resolve(sesion.fresco ?? sesion.user),
  }),
}));
vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header />,
}));
vi.mock('../../components/ui/Avatar', () => ({ default: () => <div /> }));
vi.mock('../../components/auth/AvisoVerificaParaLlegarAOtros', () => ({
  default: ({ correo }) => (
    <div data-testid="aviso-verificar" data-correo={correo} />
  ),
}));
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
import customToast from '../../utils/toast';

const sendRequest = vi.fn();
vi.mock('../../composition', () => ({
  getPlayerProfileUseCase: {
    execute: () =>
      Promise.resolve({
        id: 'u1',
        firstName: 'Ana',
        lastName: 'García',
        avatarSource: 'preset',
        avatarPresetId: 1,
        hasAvatarUpload: false,
        friendsCount: 0,
        isFriend: false,
        friendship: { status: 'NONE', friendshipId: null },
        email: null,
        handicap: null,
        stats: null,
        headToHead: null,
        gamesTogether: null,
      }),
  },
  getPlayerActivityUseCase: {
    execute: () => Promise.resolve({ events: [], nextCursor: null }),
  },
  sendFriendRequestUseCase: { execute: (...args) => sendRequest(...args) },
  respondFriendRequestUseCase: { execute: vi.fn() },
  removeFriendUseCase: { execute: vi.fn() },
  blockUserUseCase: { execute: vi.fn() },
  getGamesTogetherUseCase: {
    execute: () => Promise.resolve({ games: [], nextCursor: null }),
  },
}));

const pinta = () =>
  render(
    <MemoryRouter initialEntries={['/players/u1']}>
      <Routes>
        <Route path="/players/:userId" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PlayerProfilePage · pedir amistad sin el correo verificado (B-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendRequest.mockResolvedValue(undefined);
    sesion.fresco = null;
  });

  it('acaba de verificar en otra pestaña: se vuelve a preguntar y la solicitud sale', async () => {
    sesion.user = { id: 'me', email: 'yo@x.test', email_verified: false };
    sesion.fresco = { id: 'me', email: 'yo@x.test', email_verified: true };
    pinta();

    fireEvent.click(await screen.findByTestId('player-profile-add-friend'));

    await waitFor(() => expect(sendRequest).toHaveBeenCalledWith('u1'));
    expect(screen.queryByTestId('aviso-verificar')).not.toBeInTheDocument();
  });

  it('V6: sin verificar, el aviso en vez de la petición', async () => {
    sesion.user = { id: 'me', email: 'yo@x.test', email_verified: false };
    pinta();

    fireEvent.click(await screen.findByTestId('player-profile-add-friend'));

    expect(await screen.findByTestId('aviso-verificar')).toHaveAttribute(
      'data-correo',
      'yo@x.test',
    );
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it('V7: si la API dice EMAIL_NOT_VERIFIED, el aviso y no un error genérico', async () => {
    sesion.user = { id: 'me', email: 'yo@x.test', email_verified: true };
    sendRequest.mockRejectedValue(
      Object.assign(new Error('no'), {
        status: 403,
        errorCode: 'EMAIL_NOT_VERIFIED',
      }),
    );
    pinta();

    fireEvent.click(await screen.findByTestId('player-profile-add-friend'));

    expect(await screen.findByTestId('aviso-verificar')).toBeInTheDocument();
    await waitFor(() => expect(sendRequest).toHaveBeenCalled());
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('verificado, se pide como siempre', async () => {
    sesion.user = { id: 'me', email: 'yo@x.test', email_verified: true };
    pinta();

    fireEvent.click(await screen.findByTestId('player-profile-add-friend'));

    await waitFor(() => expect(sendRequest).toHaveBeenCalledWith('u1'));
    expect(screen.queryByTestId('aviso-verificar')).not.toBeInTheDocument();
  });
});
