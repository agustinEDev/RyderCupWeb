import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PlayerProfilePage from './PlayerProfilePage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' }, loading: false }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));

vi.mock('../../components/ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const getProfile = vi.fn();
const getActivity = vi.fn();
const sendRequest = vi.fn();
const respondRequest = vi.fn();

vi.mock('../../composition', () => ({
  getPlayerProfileUseCase: { execute: (...args) => getProfile(...args) },
  getPlayerActivityUseCase: { execute: (...args) => getActivity(...args) },
  sendFriendRequestUseCase: { execute: (...args) => sendRequest(...args) },
  respondFriendRequestUseCase: { execute: (...args) => respondRequest(...args) },
}));

const perfil = (overrides = {}) => ({
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
  ...overrides,
});

const estadisticas = (overrides = {}) => ({
  handicap: 12.4,
  handicapTrend: -0.6,
  scoringAvg: 3.2,
  roundsPlayed: 14,
  tournamentsTotal: 2,
  tournamentsActive: 1,
  estimatedIndex: 11.8,
  playingAvg: 15.1,
  bestDifferential: 8.3,
  roundsWithDifferential: 12,
  ...overrides,
});

const amigo = (overrides = {}) =>
  perfil({
    isFriend: true,
    friendship: { status: 'ACCEPTED', friendshipId: 'f1' },
    email: 'ana@example.com',
    handicap: 12.4,
    stats: estadisticas(),
    ...overrides,
  });

const paginaActividad = (overrides = {}) => ({
  events: [
    {
      id: 'e1',
      userId: 'u1',
      type: 'BIRDIE',
      occurredAt: new Date('2026-08-10T12:00:00'),
      payload: { count: 2, holes: [3, 7] },
      sourceMatchId: 'm1',
    },
  ],
  authors: { u1: { id: 'u1', firstName: 'Ana', lastName: 'García' } },
  nextCursor: null,
  unseenCount: 0,
  ...overrides,
});

const error = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

const renderProfile = (userId = 'u1') =>
  render(
    <MemoryRouter initialEntries={[`/players/${userId}`]}>
      <Routes>
        <Route path="/players/:userId" element={<PlayerProfilePage />} />
        <Route path="/profile" element={<div data-testid="own-profile" />} />
      </Routes>
    </MemoryRouter>
  );

describe('PlayerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue(perfil());
    getActivity.mockResolvedValue(paginaActividad());
    sendRequest.mockResolvedValue(undefined);
    respondRequest.mockResolvedValue(undefined);
  });

  describe('the public card anyone sees', () => {
    it('shows name, photo and friend count to someone who is not a friend', async () => {
      renderProfile();

      expect(await screen.findByTestId('player-profile-card')).toBeInTheDocument();
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-u1')).toBeInTheDocument();
      expect(screen.getByText('playerProfile:friendsCount')).toBeInTheDocument();
    });

    it('offers a way back to the feed, which the desktop header does not give', async () => {
      // En escritorio la cabecera no pinta flecha, asi que sin este enlace se
      // entra al perfil y no hay forma de salir salvo el boton del navegador
      renderProfile();

      const volver = await screen.findByRole('link', { name: 'playerProfile:backToFeed' });
      expect(volver).toHaveAttribute('href', '/feed');
    });

    it('explains what is behind a friendship instead of showing empty fields', async () => {
      // Los campos privados llegan en null, no a cero: hay que decir que no se
      // pueden ver, no dar a entender que no tiene datos.
      renderProfile();

      expect(await screen.findByTestId('player-profile-private')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-stats')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-contact')).not.toBeInTheDocument();
    });

    it('never asks for the activity of someone who is not a friend', async () => {
      renderProfile();

      await screen.findByTestId('player-profile-private');
      expect(getActivity).not.toHaveBeenCalled();
    });
  });

  describe('what only friends see', () => {
    it('shows email, stats and activity once you are friends', async () => {
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      expect(await screen.findByTestId('player-profile-contact')).toBeInTheDocument();
      expect(screen.getByText('ana@example.com')).toBeInTheDocument();
      expect(screen.getByTestId('player-profile-stats')).toBeInTheDocument();
      expect(screen.getByTestId('activity-event-e1')).toBeInTheDocument();
    });

    it('marks the estimated index as not being the official one', async () => {
      // Quien lo lee aquí puede confundirlo con su hándicap de federación.
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      expect(await screen.findByTestId('player-profile-stat-estimatedIndex')).toHaveTextContent(
        'playerProfile:stats.estimatedIndexHint'
      );
    });

    it('says they publish nothing when the activity comes back forbidden', async () => {
      // Un 403 con amistad aceptada significa que no publica, no que algo falle:
      // el resto del perfil sigue siendo válido.
      getProfile.mockResolvedValue(amigo());
      getActivity.mockRejectedValue(error(403));
      renderProfile();

      expect(await screen.findByTestId('player-profile-activity')).toHaveTextContent(
        'playerProfile:activity.hidden'
      );
      expect(screen.getByTestId('player-profile-stats')).toBeInTheDocument();
    });

    it('appends the next page of activity instead of replacing it', async () => {
      getProfile.mockResolvedValue(amigo());
      getActivity
        .mockResolvedValueOnce(paginaActividad({ nextCursor: 'cursor-1' }))
        .mockResolvedValueOnce(
          paginaActividad({
            events: [
              {
                id: 'e2',
                userId: 'u1',
                type: 'EAGLE_OR_BETTER',
                occurredAt: new Date('2026-08-09T12:00:00'),
                payload: {},
                sourceMatchId: 'm2',
              },
            ],
            nextCursor: null,
          })
        );
      renderProfile();

      await screen.findByTestId('activity-event-e1');
      fireEvent.click(screen.getByTestId('player-profile-load-more'));

      expect(await screen.findByTestId('activity-event-e2')).toBeInTheDocument();
      expect(screen.getByTestId('activity-event-e1')).toBeInTheDocument();
    });

    it('does not show a stats grid for a friend who has not played yet', async () => {
      getProfile.mockResolvedValue(amigo({ stats: estadisticas({ roundsPlayed: 0 }) }));
      renderProfile();

      expect(await screen.findByTestId('player-profile-stats-empty')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-stats')).not.toBeInTheDocument();
    });
  });

  describe('the friendship button', () => {
    it('offers to send a request when there is no relationship', async () => {
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-add-friend'));

      await waitFor(() => expect(sendRequest).toHaveBeenCalledWith('u1'));
    });

    it('distinguishes a request you sent from one you received', async () => {
      // No llevan al mismo sitio: una espera respuesta del otro, la otra la tuya.
      getProfile.mockResolvedValue(
        perfil({ friendship: { status: 'PENDING_SENT', friendshipId: 'f1' } })
      );
      renderProfile();

      expect(await screen.findByTestId('player-profile-friendship-sent')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-add-friend')).not.toBeInTheDocument();
    });

    it('lets you accept a request received, with the friendship id', async () => {
      getProfile.mockResolvedValue(
        perfil({ friendship: { status: 'PENDING_RECEIVED', friendshipId: 'f1' } })
      );
      renderProfile();

      await screen.findByTestId('player-profile-friendship-received');
      fireEvent.click(screen.getByText('playerProfile:friendship.accept'));

      await waitFor(() => expect(respondRequest).toHaveBeenCalledWith('f1', 'ACCEPT'));
    });

    it('reloads the whole profile after accepting, not just the button', async () => {
      // Aceptar abre de golpe hándicap, estadísticas y actividad, que hasta ese
      // momento llegaban en null.
      getProfile
        .mockResolvedValueOnce(
          perfil({ friendship: { status: 'PENDING_RECEIVED', friendshipId: 'f1' } })
        )
        .mockResolvedValueOnce(amigo());
      renderProfile();

      await screen.findByTestId('player-profile-friendship-received');
      fireEvent.click(screen.getByText('playerProfile:friendship.accept'));

      expect(await screen.findByTestId('player-profile-stats')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('sends you to your own profile instead of showing you a stranger card', async () => {
      renderProfile('me');

      expect(await screen.findByTestId('own-profile')).toBeInTheDocument();
      expect(getProfile).not.toHaveBeenCalled();
    });

    it('shows a not-found state on 404, which also covers a profile you cannot see', async () => {
      // El backend responde 404 y nunca 403 a propósito: un 403 confirmaría que
      // la cuenta existe.
      getProfile.mockRejectedValue(error(404));
      renderProfile();

      expect(await screen.findByTestId('player-profile-not-found')).toBeInTheDocument();
    });
  });
});
