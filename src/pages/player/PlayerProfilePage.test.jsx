import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PlayerProfilePage from './PlayerProfilePage';
import es from '../../i18n/locales/es/playerProfile.json';
import en from '../../i18n/locales/en/playerProfile.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

// Un solo objeto `user`: uno nuevo en cada render vuelve intermitentes los
// tests de páginas con efectos sobre él
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
const getActivity = vi.fn();
const sendRequest = vi.fn();
const respondRequest = vi.fn();
const removeFriend = vi.fn();
const blockUser = vi.fn();
const getGamesTogether = vi.fn();

vi.mock('../../composition', () => ({
  getPlayerProfileUseCase: { execute: (...args) => getProfile(...args) },
  getPlayerActivityUseCase: { execute: (...args) => getActivity(...args) },
  sendFriendRequestUseCase: { execute: (...args) => sendRequest(...args) },
  respondFriendRequestUseCase: { execute: (...args) => respondRequest(...args) },
  removeFriendUseCase: { execute: (...args) => removeFriend(...args) },
  blockUserUseCase: { execute: (...args) => blockUser(...args) },
  getGamesTogetherUseCase: { execute: (...args) => getGamesTogether(...args) },
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
  headToHead: null,
  gamesTogether: null,
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

// Una partida jugada juntos, como la deja el repositorio
const juego = (overrides = {}) => ({
  kind: 'QUICK_MATCH',
  id: 'g1',
  playedOn: '2026-10-15',
  golfCourseId: 'c1',
  golfCourseName: 'El Saler',
  format: 'STABLEFORD',
  relation: 'AGAINST',
  result: 'WON',
  quickMatchId: 'g1',
  competitionId: null,
  competitionName: null,
  matchId: null,
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
    removeFriend.mockResolvedValue(undefined);
    blockUser.mockResolvedValue({});
    getGamesTogether.mockResolvedValue({ games: [], nextCursor: null });
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

    it('sends you back to friends when that is where you came from', async () => {
      // Revisando solicitudes se entra y se sale del perfil una vez por cada
      // una: devolver siempre al feed obliga a rehacer el camino cada vez
      render(
        <MemoryRouter initialEntries={[{ pathname: '/players/u1', state: { from: 'friends' } }]}>
          <Routes>
            <Route path="/players/:userId" element={<PlayerProfilePage />} />
          </Routes>
        </MemoryRouter>
      );

      const volver = await screen.findByRole('link', { name: 'playerProfile:backToFriends' });
      expect(volver).toHaveAttribute('href', '/friends');
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
    it('shows stats and activity once you are friends', async () => {
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      expect(await screen.findByTestId('player-profile-stats')).toBeInTheDocument();
      expect(screen.getByTestId('activity-event-e1')).toBeInTheDocument();
    });

    it("never shows another player's email, not even to a friend and even if the API sends it", async () => {
      // Decisión de producto (Agustín, 21 oct): el correo de otro no se enseña.
      // El propio sigue en /profile
      getProfile.mockResolvedValue(amigo({ email: 'ana@example.com' }));
      const { container } = renderProfile();

      await screen.findByTestId('player-profile-stats');
      expect(screen.queryByTestId('player-profile-contact')).not.toBeInTheDocument();
      expect(screen.queryByText(/ana@example\.com/)).not.toBeInTheDocument();
      expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
      expect(document.body.innerHTML).not.toContain('ana@example.com');
    });

    it('marks the estimated index as not being the official one', async () => {
      // Quien lo lee aquí puede confundirlo con su hándicap de federación.
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      expect(await screen.findByTestId('player-profile-stat-estimatedIndex')).toHaveTextContent(
        'playerProfile:stats.estimatedIndexHint'
      );
    });

    // Un hándicap plus se guarda negativo y se lee con «+» (FE #797)
    it('shows a plus handicap and a plus estimated index with their plus sign', async () => {
      getProfile.mockResolvedValue(amigo({ handicap: -2, stats: estadisticas({ estimatedIndex: -0.4 }) }));
      renderProfile();

      expect(await screen.findByTestId('player-profile-stat-handicap')).toHaveTextContent('+2.0');
      expect(screen.getByTestId('player-profile-stat-estimatedIndex')).toHaveTextContent('+0.4');
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

    it('keeps the course names of every page when loading more (review FE-1)', async () => {
      getProfile.mockResolvedValue(amigo());
      getActivity
        .mockResolvedValueOnce(
          paginaActividad({
            events: [{ id: 'e1', userId: 'u1', type: 'BIRDIE', occurredAt: new Date('2026-08-10T12:00:00'), payload: { count: 1, golf_course_id: 'c1' }, sourceMatchId: 'm1' }],
            courses: { c1: 'Campo Uno' },
            nextCursor: 'cursor-1',
          })
        )
        .mockResolvedValueOnce(
          paginaActividad({
            events: [{ id: 'e2', userId: 'u1', type: 'BIRDIE', occurredAt: new Date('2026-08-09T12:00:00'), payload: { count: 1, golf_course_id: 'c2' }, sourceMatchId: 'm2' }],
            courses: { c2: 'Campo Dos' },
            nextCursor: null,
          })
        );
      renderProfile();

      await screen.findByTestId('activity-event-e1');
      fireEvent.click(screen.getByTestId('player-profile-load-more'));

      expect(await screen.findByTestId('activity-event-e2')).toHaveTextContent('Campo Dos');
      expect(screen.getByTestId('activity-event-e1')).toHaveTextContent('Campo Uno');
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

  // ─── FE-2: perfil amigo / no amigo (tabla aprobada el 22 oct) ───────────────

  describe('case 1 - the status button follows the relationship', () => {
    it('offers «Añadir amigo» when there is no relationship', async () => {
      renderProfile();

      expect(await screen.findByTestId('player-profile-add-friend')).toHaveTextContent(
        'playerProfile:friendship.add'
      );
      expect(screen.queryByTestId('player-profile-friendship-accepted')).not.toBeInTheDocument();
    });

    it('treats a declined request like no relationship', async () => {
      getProfile.mockResolvedValue(perfil({ friendship: { status: 'DECLINED', friendshipId: 'f1' } }));
      renderProfile();

      expect(await screen.findByTestId('player-profile-add-friend')).toBeInTheDocument();
    });

    it('says the request was sent and lets you cancel it', async () => {
      getProfile
        .mockResolvedValueOnce(perfil({ friendship: { status: 'PENDING_SENT', friendshipId: 'f1' } }))
        .mockResolvedValueOnce(perfil());
      renderProfile();

      const enviada = await screen.findByTestId('player-profile-friendship-sent');
      expect(enviada).toHaveTextContent('playerProfile:friendship.sent');
      fireEvent.click(within(enviada).getByTestId('player-profile-cancel-request'));

      await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('f1'));
      expect(await screen.findByTestId('player-profile-add-friend')).toBeInTheDocument();
      expect(customToast.success).toHaveBeenCalledWith('playerProfile:friendship.cancelled');
    });

    it('offers «Aceptar» for a request you received', async () => {
      getProfile.mockResolvedValue(
        perfil({ friendship: { status: 'PENDING_RECEIVED', friendshipId: 'f1' } })
      );
      renderProfile();

      const recibida = await screen.findByTestId('player-profile-friendship-received');
      expect(within(recibida).getByRole('button', { name: 'playerProfile:friendship.accept' })).toBeEnabled();
      expect(screen.queryByTestId('player-profile-add-friend')).not.toBeInTheDocument();
    });

    it('says «Amigos» once you are friends, with no button to add', async () => {
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      expect(await screen.findByTestId('player-profile-friendship-accepted')).toHaveTextContent(
        'playerProfile:friendship.friends'
      );
      expect(screen.queryByTestId('player-profile-add-friend')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-cancel-request')).not.toBeInTheDocument();
    });
  });

  describe('case 2 - the «⋯» menu', () => {
    const abreElMenu = async () => {
      fireEvent.click(await screen.findByTestId('player-profile-menu'));
      return screen.findByRole('menu');
    };

    it('offers to remove and to block a friend', async () => {
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      const menu = await abreElMenu();
      expect(within(menu).getByTestId('player-profile-menu-remove')).toHaveTextContent(
        'playerProfile:menu.remove'
      );
      expect(within(menu).getByTestId('player-profile-menu-block')).toHaveTextContent(
        'playerProfile:menu.block'
      );
    });

    it('offers to block someone who is not a friend, but not to remove them', async () => {
      renderProfile();

      const menu = await abreElMenu();
      expect(within(menu).getByTestId('player-profile-menu-block')).toBeInTheDocument();
      expect(within(menu).queryByTestId('player-profile-menu-remove')).not.toBeInTheDocument();
    });

    it('offers to block with a request pending, and still not to remove', async () => {
      getProfile.mockResolvedValue(perfil({ friendship: { status: 'PENDING_SENT', friendshipId: 'f1' } }));
      renderProfile();

      const menu = await abreElMenu();
      expect(within(menu).getByTestId('player-profile-menu-block')).toBeInTheDocument();
      expect(within(menu).queryByTestId('player-profile-menu-remove')).not.toBeInTheDocument();
    });

    it('closes the menu with Escape without doing anything', async () => {
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      await abreElMenu();
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      expect(removeFriend).not.toHaveBeenCalled();
      expect(blockUser).not.toHaveBeenCalled();
    });

    it('asks before removing a friend, and removes with the friendship id once confirmed', async () => {
      getProfile.mockResolvedValueOnce(amigo()).mockResolvedValueOnce(perfil());
      renderProfile();

      const menu = await abreElMenu();
      fireEvent.click(within(menu).getByTestId('player-profile-menu-remove'));

      const dialogo = await screen.findByRole('dialog');
      expect(dialogo).toHaveTextContent('playerProfile:confirm.remove.title');
      expect(removeFriend).not.toHaveBeenCalled();

      fireEvent.click(within(dialogo).getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('f1'));
      expect(blockUser).not.toHaveBeenCalled();
      expect(await screen.findByTestId('player-profile-add-friend')).toBeInTheDocument();
      expect(customToast.success).toHaveBeenCalledWith('playerProfile:friendship.removed');
    });

    it('asks before blocking, and blocks the player once confirmed', async () => {
      getProfile
        .mockResolvedValueOnce(amigo())
        .mockResolvedValueOnce(perfil({ friendship: { status: 'BLOCKED', friendshipId: 'f1' } }));
      renderProfile();

      const menu = await abreElMenu();
      fireEvent.click(within(menu).getByTestId('player-profile-menu-block'));

      const dialogo = await screen.findByRole('dialog');
      expect(dialogo).toHaveTextContent('playerProfile:confirm.block.title');
      expect(blockUser).not.toHaveBeenCalled();

      fireEvent.click(within(dialogo).getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(blockUser).toHaveBeenCalledWith('u1'));
      expect(removeFriend).not.toHaveBeenCalled();
      expect(await screen.findByTestId('player-profile-friendship-blocked')).toBeInTheDocument();
      expect(customToast.success).toHaveBeenCalledWith('playerProfile:friendship.blockedNow');
    });

    it('changes nothing when the removal is cancelled', async () => {
      getProfile.mockResolvedValue(amigo());
      renderProfile();

      const menu = await abreElMenu();
      fireEvent.click(within(menu).getByTestId('player-profile-menu-remove'));
      const dialogo = await screen.findByRole('dialog');
      fireEvent.click(within(dialogo).getByRole('button', { name: 'modal.cancel' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(removeFriend).not.toHaveBeenCalled();
      expect(getProfile).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('player-profile-friendship-accepted')).toBeInTheDocument();
    });

    it('changes nothing when the block is dismissed with Escape', async () => {
      renderProfile();

      const menu = await abreElMenu();
      fireEvent.click(within(menu).getByTestId('player-profile-menu-block'));
      await screen.findByRole('dialog');
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(blockUser).not.toHaveBeenCalled();
      expect(screen.getByTestId('player-profile-add-friend')).toBeInTheDocument();
    });

    it('closes the confirmation at once, even while the block is still in flight', async () => {
      // De un modal se sale siempre (4 oct): cerrar no espera a la petición
      blockUser.mockReturnValue(new Promise(() => {}));
      renderProfile();

      const menu = await abreElMenu();
      fireEvent.click(within(menu).getByTestId('player-profile-menu-block'));
      fireEvent.click(within(await screen.findByRole('dialog')).getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(blockUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('case 3 - a blocked profile', () => {
    const bloqueado = () =>
      perfil({ friendship: { status: 'BLOCKED', friendshipId: 'f1' }, friendsCount: 0 });

    it('says «Bloqueado», offers «Desbloquear» and hides everything else', async () => {
      getProfile.mockResolvedValue(bloqueado());
      renderProfile();

      expect(await screen.findByTestId('player-profile-friendship-blocked')).toHaveTextContent(
        'playerProfile:friendship.blocked'
      );
      expect(screen.getByTestId('player-profile-unblock')).toHaveTextContent(
        'playerProfile:friendship.unblock'
      );
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.queryByText('playerProfile:friendsCount')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-handicap')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-private')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-menu')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-add-friend')).not.toBeInTheDocument();
    });

    it('goes back to no relationship after unblocking', async () => {
      getProfile.mockResolvedValueOnce(bloqueado()).mockResolvedValueOnce(perfil());
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-unblock'));

      await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('f1'));
      expect(await screen.findByTestId('player-profile-add-friend')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-friendship-blocked')).not.toBeInTheDocument();
      expect(customToast.success).toHaveBeenCalledWith('playerProfile:friendship.unblocked');
    });
  });

  describe('case 4 - someone who is not a friend', () => {
    it('shows name, photo, friend count and handicap, plus the hint', async () => {
      getProfile.mockResolvedValue(perfil({ handicap: 12.4 }));
      renderProfile();

      const ficha = await screen.findByTestId('player-profile-card');
      expect(within(ficha).getByText('Ana García')).toBeInTheDocument();
      expect(within(ficha).getByTestId('avatar-u1')).toBeInTheDocument();
      expect(within(ficha).getByText('playerProfile:friendsCount')).toBeInTheDocument();
      expect(within(ficha).getByTestId('player-profile-handicap')).toHaveTextContent('12.4');
      expect(screen.getByTestId('player-profile-private')).toHaveTextContent('playerProfile:private.hint');
    });

    it('shows a plus handicap with its sign and a missing one as a dash', async () => {
      getProfile.mockResolvedValueOnce(perfil({ handicap: -2 }));
      const { unmount } = renderProfile();
      expect(await screen.findByTestId('player-profile-handicap')).toHaveTextContent('+2.0');
      unmount();

      getProfile.mockResolvedValueOnce(perfil({ handicap: null }));
      renderProfile();
      expect(await screen.findByTestId('player-profile-handicap')).toHaveTextContent(
        'playerProfile:stats.noValue'
      );
    });

    it('shows no head to head and no games together, and never asks for them', async () => {
      renderProfile();

      await screen.findByTestId('player-profile-private');
      expect(screen.queryByTestId('player-profile-h2h')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-games')).not.toBeInTheDocument();
      expect(getGamesTogether).not.toHaveBeenCalled();
    });
  });

  describe('case 5 - a friend', () => {
    it('shows handicap, stats, activity, head to head and games together', async () => {
      getProfile.mockResolvedValue(
        amigo({
          headToHead: { against: { won: 1, halved: 0, lost: 0 }, alongside: null },
          gamesTogether: { games: [juego()], nextCursor: null },
        })
      );
      renderProfile();

      expect(await screen.findByTestId('player-profile-handicap')).toHaveTextContent('12.4');
      expect(screen.getByTestId('player-profile-stats')).toBeInTheDocument();
      expect(screen.getByTestId('activity-event-e1')).toBeInTheDocument();
      expect(screen.getByTestId('player-profile-h2h')).toBeInTheDocument();
      expect(screen.getByTestId('player-profile-games')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-private')).not.toBeInTheDocument();
    });

    it('asks for the activity 5 at a time, also when loading more', async () => {
      getProfile.mockResolvedValue(amigo());
      getActivity
        .mockResolvedValueOnce(paginaActividad({ nextCursor: 'cursor-1' }))
        .mockResolvedValueOnce(paginaActividad({ events: [], nextCursor: null }));
      renderProfile();

      await screen.findByTestId('activity-event-e1');
      expect(getActivity).toHaveBeenCalledWith('u1', { limit: 5 });

      fireEvent.click(screen.getByTestId('player-profile-load-more'));
      await waitFor(() =>
        expect(getActivity).toHaveBeenLastCalledWith('u1', { limit: 5, cursor: 'cursor-1' })
      );
    });
  });

  describe('case 6 - head to head', () => {
    it('shows «Contra él» and «Con él», each with won, halved and lost', async () => {
      getProfile.mockResolvedValue(
        amigo({
          headToHead: {
            against: { won: 3, halved: 1, lost: 2 },
            alongside: { won: 4, halved: 0, lost: 5 },
          },
        })
      );
      renderProfile();

      const contra = await screen.findByTestId('player-profile-h2h-against');
      expect(contra).toHaveTextContent('playerProfile:headToHead.against');
      expect(within(contra).getByTestId('player-profile-h2h-against-won')).toHaveTextContent('3');
      expect(within(contra).getByTestId('player-profile-h2h-against-won')).toHaveTextContent('playerProfile:headToHead.won');
      expect(within(contra).getByTestId('player-profile-h2h-against-halved')).toHaveTextContent('1');
      expect(within(contra).getByTestId('player-profile-h2h-against-halved')).toHaveTextContent('playerProfile:headToHead.halved');
      expect(within(contra).getByTestId('player-profile-h2h-against-lost')).toHaveTextContent('2');
      expect(within(contra).getByTestId('player-profile-h2h-against-lost')).toHaveTextContent('playerProfile:headToHead.lost');

      const con = screen.getByTestId('player-profile-h2h-alongside');
      expect(con).toHaveTextContent('playerProfile:headToHead.alongside');
      expect(within(con).getByTestId('player-profile-h2h-alongside-won')).toHaveTextContent('4');
      expect(within(con).getByTestId('player-profile-h2h-alongside-halved')).toHaveTextContent('0');
      expect(within(con).getByTestId('player-profile-h2h-alongside-lost')).toHaveTextContent('5');
    });

    it('hides «Con él» when you never played on the same side', async () => {
      getProfile.mockResolvedValue(
        amigo({ headToHead: { against: { won: 1, halved: 0, lost: 0 }, alongside: null } })
      );
      renderProfile();

      expect(await screen.findByTestId('player-profile-h2h-against')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-h2h-alongside')).not.toBeInTheDocument();
    });

    it('hides «Contra él» when you never played against each other', async () => {
      getProfile.mockResolvedValue(
        amigo({ headToHead: { against: null, alongside: { won: 0, halved: 1, lost: 0 } } })
      );
      renderProfile();

      expect(await screen.findByTestId('player-profile-h2h-alongside')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-h2h-against')).not.toBeInTheDocument();
    });

    it('hides the whole block when there is no head to head', async () => {
      getProfile.mockResolvedValue(amigo({ headToHead: null }));
      renderProfile();

      await screen.findByTestId('player-profile-stats');
      expect(screen.queryByTestId('player-profile-h2h')).not.toBeInTheDocument();
    });

    it('hides the whole block when both sections are empty', async () => {
      getProfile.mockResolvedValue(amigo({ headToHead: { against: null, alongside: null } }));
      renderProfile();

      await screen.findByTestId('player-profile-stats');
      expect(screen.queryByTestId('player-profile-h2h')).not.toBeInTheDocument();
    });
  });

  describe('case 7 - games together', () => {
    const tresJuegos = () => [
      juego({ id: 'g1', quickMatchId: 'g1', playedOn: '2026-10-15' }),
      juego({
        kind: 'TOURNAMENT_MATCH',
        id: 'm1',
        playedOn: '2026-10-10',
        golfCourseName: 'La Moraleja',
        format: 'FOURBALL',
        relation: 'WITH',
        result: 'LOST',
        quickMatchId: null,
        competitionId: 'comp1',
        competitionName: 'Ryder de otoño',
        matchId: 'm1',
      }),
      juego({
        kind: 'TOURNAMENT_GROUP',
        id: 'gr1',
        playedOn: '2026-10-01',
        golfCourseName: 'Golf Santander',
        format: 'MEDAL',
        result: null,
        quickMatchId: null,
        competitionId: 'comp2',
        competitionName: 'Liga',
        matchId: 'gr1',
      }),
    ];

    it('lists them in the order they come, newest first, each linking to its game', async () => {
      getProfile.mockResolvedValue(amigo({ gamesTogether: { games: tresJuegos(), nextCursor: null } }));
      renderProfile();

      const lista = await screen.findByTestId('player-profile-games');
      const enlaces = within(lista).getAllByRole('link');
      expect(enlaces.map((a) => a.getAttribute('data-testid'))).toEqual([
        'player-profile-game-g1',
        'player-profile-game-m1',
        'player-profile-game-gr1',
      ]);
      expect(enlaces[0]).toHaveAttribute('href', '/quick-matches/g1/scoring');
      expect(enlaces[1]).toHaveAttribute('href', '/player/matches/m1/scoring');
      expect(enlaces[2]).toHaveAttribute('href', '/player/groups/gr1/scoring?competition=comp2');
    });

    it('shows date, course, format and result of each game', async () => {
      getProfile.mockResolvedValue(amigo({ gamesTogether: { games: tresJuegos(), nextCursor: null } }));
      renderProfile();

      const primera = await screen.findByTestId('player-profile-game-g1');
      expect(primera).toHaveTextContent('15 oct 2026');
      expect(primera).toHaveTextContent('El Saler');
      expect(primera).toHaveTextContent('playerProfile:gamesTogether.format.STABLEFORD');
      expect(primera).toHaveTextContent('playerProfile:gamesTogether.result.WON');

      const segunda = screen.getByTestId('player-profile-game-m1');
      expect(segunda).toHaveTextContent('10 oct 2026');
      expect(segunda).toHaveTextContent('La Moraleja');
      expect(segunda).toHaveTextContent('playerProfile:gamesTogether.format.FOURBALL');
      expect(segunda).toHaveTextContent('playerProfile:gamesTogether.result.LOST');
      expect(segunda).toHaveTextContent('playerProfile:gamesTogether.relation.WITH');

      expect(screen.getByTestId('player-profile-game-gr1')).toHaveTextContent(
        'playerProfile:gamesTogether.result.none'
      );
    });

    it('does not link a game it cannot open', async () => {
      // Una partida de franja sin su torneo no se puede leer
      getProfile.mockResolvedValue(
        amigo({
          gamesTogether: {
            games: [
              juego({ kind: 'TOURNAMENT_GROUP', id: 'gr9', quickMatchId: null, competitionId: null, matchId: 'gr9' }),
              juego({ id: 'g8', quickMatchId: null }),
            ],
            nextCursor: null,
          },
        })
      );
      renderProfile();

      const sinTorneo = await screen.findByTestId('player-profile-game-gr9');
      expect(sinTorneo.tagName).not.toBe('A');
      expect(screen.getByTestId('player-profile-game-g8').tagName).not.toBe('A');
    });

    it('loads 5 more with «Ver más» and appends them after the first ones', async () => {
      const cinco = ['g1', 'g2', 'g3', 'g4', 'g5'].map((id) => juego({ id, quickMatchId: id }));
      getProfile.mockResolvedValue(amigo({ gamesTogether: { games: cinco, nextCursor: 'cur-5' } }));
      getGamesTogether.mockResolvedValue({
        games: [juego({ id: 'g6', quickMatchId: 'g6' })],
        nextCursor: null,
      });
      renderProfile();

      const mas = await screen.findByTestId('player-profile-games-more');
      expect(mas).toHaveTextContent('playerProfile:gamesTogether.loadMore');
      fireEvent.click(mas);

      await waitFor(() => expect(getGamesTogether).toHaveBeenCalledWith('u1', { cursor: 'cur-5' }));
      expect(await screen.findByTestId('player-profile-game-g6')).toBeInTheDocument();
      const ids = within(screen.getByTestId('player-profile-games'))
        .getAllByRole('link')
        .map((a) => a.getAttribute('data-testid'));
      expect(ids).toEqual(['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((id) => `player-profile-game-${id}`));
      expect(screen.queryByTestId('player-profile-games-more')).not.toBeInTheDocument();
    });

    it('keeps what it had and says so when loading more fails', async () => {
      getProfile.mockResolvedValue(amigo({ gamesTogether: { games: [juego()], nextCursor: 'cur-1' } }));
      getGamesTogether.mockRejectedValue(error(500));
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-games-more'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:errors.generic'));
      expect(screen.getByTestId('player-profile-game-g1')).toBeInTheDocument();
      expect(screen.getByTestId('player-profile-games-more')).toBeEnabled();
    });

    it('hides the section when you have not played together', async () => {
      getProfile.mockResolvedValueOnce(amigo({ gamesTogether: { games: [], nextCursor: null } }));
      const { unmount } = renderProfile();
      await screen.findByTestId('player-profile-stats');
      expect(screen.queryByTestId('player-profile-games')).not.toBeInTheDocument();
      unmount();

      getProfile.mockResolvedValueOnce(amigo({ gamesTogether: null }));
      renderProfile();
      await screen.findByTestId('player-profile-stats');
      expect(screen.queryByTestId('player-profile-games')).not.toBeInTheDocument();
    });
  });

  describe('case 8 - your own profile', () => {
    it('has no head to head, no games together and no «⋯» menu', async () => {
      renderProfile('me');

      expect(await screen.findByTestId('own-profile')).toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-menu')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-h2h')).not.toBeInTheDocument();
      expect(screen.queryByTestId('player-profile-games')).not.toBeInTheDocument();
      expect(getGamesTogether).not.toHaveBeenCalled();
    });
  });

  describe('case 9 - a failed action keeps the state', () => {
    it('keeps «Amigos» and shows a toast when blocking fails', async () => {
      getProfile.mockResolvedValue(amigo());
      blockUser.mockRejectedValue(error(500));
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-menu'));
      fireEvent.click(await screen.findByTestId('player-profile-menu-block'));
      fireEvent.click(within(await screen.findByRole('dialog')).getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:errors.generic'));
      expect(screen.getByTestId('player-profile-friendship-accepted')).toBeInTheDocument();
      expect(screen.getByTestId('player-profile-menu')).toBeEnabled();
      expect(getProfile).toHaveBeenCalledTimes(1);
    });

    it('keeps «Amigos» and shows a toast when removing fails', async () => {
      getProfile.mockResolvedValue(amigo());
      removeFriend.mockRejectedValue(error(500));
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-menu'));
      fireEvent.click(await screen.findByTestId('player-profile-menu-remove'));
      fireEvent.click(within(await screen.findByRole('dialog')).getByTestId('confirm-modal-confirm'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:errors.generic'));
      expect(screen.getByTestId('player-profile-friendship-accepted')).toBeInTheDocument();
    });

    it('gives the add button back, enabled, when sending fails', async () => {
      sendRequest.mockRejectedValue(error(500));
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-add-friend'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:errors.generic'));
      expect(screen.getByTestId('player-profile-add-friend')).toBeEnabled();
      expect(customToast.success).not.toHaveBeenCalled();
    });

    it('keeps the request pending when cancelling it fails', async () => {
      getProfile.mockResolvedValue(perfil({ friendship: { status: 'PENDING_SENT', friendshipId: 'f1' } }));
      removeFriend.mockRejectedValue(error(500));
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-cancel-request'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:errors.generic'));
      expect(screen.getByTestId('player-profile-cancel-request')).toBeEnabled();
    });

    it('stays blocked when unblocking fails', async () => {
      getProfile.mockResolvedValue(perfil({ friendship: { status: 'BLOCKED', friendshipId: 'f1' } }));
      removeFriend.mockRejectedValue(error(403));
      renderProfile();

      fireEvent.click(await screen.findByTestId('player-profile-unblock'));

      await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('common:errors.generic'));
      expect(screen.getByTestId('player-profile-friendship-blocked')).toBeInTheDocument();
      expect(screen.getByTestId('player-profile-unblock')).toBeEnabled();
    });

    it('disables the status button while the action is in flight', async () => {
      sendRequest.mockReturnValue(new Promise(() => {}));
      renderProfile();

      const anadir = await screen.findByTestId('player-profile-add-friend');
      fireEvent.click(anadir);
      fireEvent.click(anadir);

      await waitFor(() => expect(anadir).toBeDisabled());
      expect(sendRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('case 9 - es + en texts', () => {
    const claves = (obj, prefijo = '') =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`]
      );

    it('has the same keys in Spanish and English', () => {
      expect(claves(en).sort()).toEqual(claves(es).sort());
    });

    it('uses the approved Spanish wording', () => {
      expect(es.friendship.add).toBe('Añadir amigo');
      expect(es.friendship.sent).toBe('Solicitud enviada');
      expect(es.friendship.accept).toBe('Aceptar');
      expect(es.friendship.friends).toBe('Amigos');
      expect(es.friendship.blocked).toBe('Bloqueado');
      expect(es.friendship.unblock).toBe('Desbloquear');
      expect(es.menu.remove).toBe('Eliminar amigo');
      expect(es.menu.block).toBe('Bloquear');
      expect(es.private.hint).toBe('Hazte su amigo para ver sus estadísticas y actividad');
      expect(es.headToHead.against).toBe('Contra él');
      expect(es.headToHead.alongside).toBe('Con él');
      expect(es.headToHead.won).toBe('Ganadas');
      expect(es.headToHead.halved).toBe('Empatadas');
      expect(es.headToHead.lost).toBe('Perdidas');
      expect(es.gamesTogether.loadMore).toBe('Ver más');
    });

    it('names every game format and result the backend can send', () => {
      for (const idioma of [es, en]) {
        for (const f of ['SINGLES', 'FOURBALL', 'FOURSOMES', 'STABLEFORD', 'MEDAL']) {
          expect(idioma.gamesTogether.format[f]).toBeTruthy();
        }
        for (const r of ['WON', 'HALVED', 'LOST', 'none']) {
          expect(idioma.gamesTogether.result[r]).toBeTruthy();
        }
        for (const r of ['AGAINST', 'WITH']) {
          expect(idioma.gamesTogether.relation[r]).toBeTruthy();
        }
      }
    });
  });
});
