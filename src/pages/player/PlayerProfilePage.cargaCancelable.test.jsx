import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PlayerProfilePage from './PlayerProfilePage';

/**
 * El perfil de otro jugador, recargado tras una acción (T2).
 *
 *   #    caso                                                  | qué pasa
 *   -----|-------------------------------------------------------|--------------------------------------------
 *   R1   la acción sale bien y la recarga responde 404         | «no encontramos a este jugador», sin el
 *        |                                                       | aviso de recarga fallida ni la relación a mano
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));
vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, loading: false }) };
});
vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));
vi.mock('../../components/ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
import customToast from '../../utils/toast';

const getProfile = vi.fn();
const sendRequest = vi.fn();
vi.mock('../../composition', () => ({
  getPlayerProfileUseCase: { execute: (...args) => getProfile(...args) },
  getPlayerActivityUseCase: { execute: vi.fn() },
  sendFriendRequestUseCase: { execute: (...args) => sendRequest(...args) },
  respondFriendRequestUseCase: { execute: vi.fn() },
  removeFriendUseCase: { execute: vi.fn() },
  blockUserUseCase: { execute: vi.fn() },
  getGamesTogetherUseCase: { execute: vi.fn() },
}));

const perfil = () => ({
  id: 'u1',
  firstName: 'Ana',
  lastName: 'García',
  avatarSource: 'preset',
  avatarPresetId: 1,
  hasAvatarUpload: false,
  friendsCount: 4,
  isFriend: false,
  friendship: { status: 'NONE', friendshipId: null },
  email: null,
  handicap: null,
  stats: null,
  headToHead: null,
  gamesTogether: null,
});
const error = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('PlayerProfilePage: la recarga tras una acción (T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendRequest.mockResolvedValue({ id: 'f9' });
  });

  it('R1: si la recarga tras la acción responde 404, la ficha pasa a «no existe», sin aviso de recarga fallida', async () => {
    getProfile.mockResolvedValueOnce(perfil()).mockRejectedValueOnce(error(404));
    render(
      <MemoryRouter initialEntries={['/players/u1']}>
        <Routes>
          <Route path="/players/:userId" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByTestId('player-profile-add-friend'));
    await act(async () => {});
    await act(async () => {});

    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId('player-profile-not-found')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
  });
});
