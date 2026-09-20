import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import InvitationsPage from './InvitationsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Test', last_name: 'User' },
    loading: false,
  }),
}));

vi.mock('../../hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    isAdmin: false,
    isCreator: true,
    isLoading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockGetCompetitionDetail = vi.fn().mockResolvedValue({
  id: 'comp-1',
  name: 'Summer Cup',
  status: 'ACTIVE',
});

const mockListCompetitionInvitations = vi.fn().mockResolvedValue({
  invitations: [],
  totalCount: 0,
});

const mockListFriends = vi.fn().mockResolvedValue({ friendships: [], totalCount: 0 });
const mockListEnrollments = vi.fn().mockResolvedValue([]);
const mockSendInvitationByEmail = vi.fn();
const mockSendInvitation = vi.fn();
const mockSearchUsers = vi.fn().mockResolvedValue([]);

vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...args) => mockGetCompetitionDetail(...args) },
  listCompetitionInvitationsUseCase: { execute: (...args) => mockListCompetitionInvitations(...args) },
  sendInvitationByEmailUseCase: { execute: (...args) => mockSendInvitationByEmail(...args) },
  sendInvitationUseCase: { execute: (...args) => mockSendInvitation(...args) },
  searchUsersUseCase: { execute: (...args) => mockSearchUsers(...args) },
  listFriendsUseCase: { execute: (...args) => mockListFriends(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/creator/competitions/comp-1/invitations']}>
      <Routes>
        <Route path="/creator/competitions/:id/invitations" element={<InvitationsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('InvitationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header and page title', async () => {
    renderPage();

    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    // Wait for async load
    expect(await screen.findByText('creator.title')).toBeInTheDocument();
  });

  it('should show empty state when no invitations', async () => {
    renderPage();
    expect(await screen.findByText('noInvitations')).toBeInTheDocument();
  });

  it('should render invitations when present', async () => {
    mockListCompetitionInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionName: 'Summer Cup',
          inviteeEmail: 'player@test.com',
          inviteeName: 'Player One',
          status: 'PENDING',
          isPending: true,
          isAccepted: false,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
        },
      ],
      totalCount: 1,
    });

    renderPage();
    expect(await screen.findByTestId('invitation-card')).toBeInTheDocument();
  });

  it('should have status filter dropdown', async () => {
    renderPage();
    expect(await screen.findByTestId('status-filter')).toBeInTheDocument();
  });

  it('should have send invitation button', async () => {
    renderPage();
    expect(await screen.findByText('creator.sendNew')).toBeInTheDocument();
  });

  describe('la pestaña de amigos se alimenta bien (FE #409)', () => {
    // `clearAllMocks` borra las llamadas, no las implementaciones: sin esto, el
    // `mockImplementation` de un test se cuela en el siguiente y lo hace fallar
    // por un motivo que no es el suyo
    beforeEach(() => {
      mockListFriends.mockReset().mockResolvedValue({ friendships: [], totalCount: 0 });
      mockListEnrollments.mockReset().mockResolvedValue([]);
      mockListCompetitionInvitations.mockReset().mockResolvedValue({ invitations: [], totalCount: 0 });
    });

    /** Abre el modal de invitar: es lo que dispara la carga de amigos. */
    const abreElModal = async () => {
      renderPage();
      fireEvent.click(await screen.findByText('creator.sendNew'));
    };

    it('1: al abrirlo se piden amigos, inscritos e invitados', async () => {
      await abreElModal();

      await waitFor(() => expect(mockListFriends).toHaveBeenCalled());
      expect(mockListEnrollments).toHaveBeenCalled();
    });

    it('2: de los inscritos solo interesan los APROBADOS', async () => {
      // Sin filtro vienen también REQUESTED, REJECTED, CANCELLED y WITHDRAWN, y
      // a quien se retiró o fue rechazado SÍ se le puede volver a invitar: el
      // backend solo bloquea por enrollment APPROVED
      await abreElModal();

      await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());

      expect(mockListEnrollments).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'APPROVED' })
      );
    });

    it('3: las invitaciones pendientes se piden aparte del listado de pantalla', async () => {
      // El listado de arriba está filtrado por lo que elija el creador y
      // paginado de 20 en 20: con el desplegable en «Aceptadas» no habría
      // ninguna pendiente y se ofrecería invitar a quien ya está invitado
      await abreElModal();

      await waitFor(() => expect(mockListCompetitionInvitations).toHaveBeenCalled());

      const llamadas = mockListCompetitionInvitations.mock.calls;
      const pidePendientes = llamadas.some(
        ([, filtros]) => filtros && filtros.status === 'PENDING'
      );
      expect(pidePendientes).toBe(true);
    });

    it('4: los amigos se piden con límite propio, no con el de por defecto', async () => {
      // `/friends/me` pagina de 20 en 20 y la de amigos es ahora la pestaña de
      // entrada: con 25 amigos se veían 20 y los otros no existían
      await abreElModal();

      await waitFor(() => expect(mockListFriends).toHaveBeenCalled());

      expect(mockListFriends).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: expect.any(Number) })
      );
    });
    it('5: los amigos que no caben en una página también llegan', async () => {
      // `/friends/me` no da más de 100 por página: con 150 amigos, 50 no existían
      const pagina = (desde, cuantos) => ({
        friendships: Array.from({ length: cuantos }, (_, i) => ({
          otherUserId: `u-${desde + i}`,
          otherUserName: `Amigo ${desde + i}`,
        })),
        totalCount: 150,
      });
      mockListFriends
        .mockResolvedValueOnce(pagina(0, 100))
        .mockResolvedValueOnce(pagina(100, 50));

      await abreElModal();

      await waitFor(() => expect(mockListFriends).toHaveBeenCalledTimes(2));
      expect(mockListFriends).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 2 })
      );
      expect(await screen.findByTestId('invite-friend-u-149')).toBeInTheDocument();
    });

    it('6: las invitaciones pendientes que no caben en una página también cuentan', async () => {
      // Si la pendiente de un amigo se queda en la página 2, se le ofrece
      // invitar otra vez y el servidor contesta 409
      mockListFriends.mockResolvedValue({
        friendships: [{ otherUserId: 'u-120', otherUserName: 'Amigo tardío' }],
        totalCount: 1,
      });
      mockListCompetitionInvitations.mockImplementation((_id, filtros = {}) => {
        if (filtros.status !== 'PENDING') return Promise.resolve({ invitations: [], totalCount: 0 });
        const pagina = filtros.page ?? 1;
        const invitados = pagina === 1
          ? Array.from({ length: 100 }, (_, i) => ({ inviteeUserId: `u-${i}` }))
          : [{ inviteeUserId: 'u-120' }];
        return Promise.resolve({ invitations: invitados, totalCount: 101 });
      });

      await abreElModal();

      const fila = await screen.findByTestId('invite-friend-u-120');
      await waitFor(() => expect(fila).toBeDisabled());
    });

    it('7: si el total no cuadra con lo que llega, se para', async () => {
      // Un `totalCount` que promete más de lo que da colgaría el bucle
      mockListFriends.mockResolvedValue({ friendships: [], totalCount: 500 });

      await abreElModal();

      await waitFor(() => expect(mockListFriends).toHaveBeenCalled());
      await new Promise((r) => globalThis.setTimeout(r, 50));
      expect(mockListFriends.mock.calls.length).toBeLessThan(10);
    });

    it('8: mientras no se sepa quién está ya dentro, no se ofrece invitar a nadie', async () => {
      // Los amigos llegan antes que las inscripciones: entre medias las filas
      // salían pulsables y se podía invitar a quien ya estaba en el torneo
      mockListFriends.mockResolvedValue({
        friendships: [{ otherUserId: 'u-1', otherUserName: 'Amigo' }],
        totalCount: 1,
      });
      mockListEnrollments.mockReturnValue(new Promise(() => {}));

      await abreElModal();

      await waitFor(() => expect(mockListFriends).toHaveBeenCalled());
      expect(await screen.findByTestId('friends-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('invite-friend-u-1')).not.toBeInTheDocument();
    });

    it('9: si no se puede comprobar quién está dentro, se dice, y no se ofrece', async () => {
      // Tratar el fallo como «no hay nadie inscrito» es afirmar lo que no se ha
      // podido preguntar: habilitaba a gente que el servidor rechaza
      mockListFriends.mockResolvedValue({
        friendships: [{ otherUserId: 'u-1', otherUserName: 'Amigo' }],
        totalCount: 1,
      });
      mockListEnrollments.mockRejectedValue(new Error('la red'));

      await abreElModal();

      expect(await screen.findByTestId('friends-eligibility-error')).toBeInTheDocument();
      expect(screen.queryByTestId('invite-friend-u-1')).not.toBeInTheDocument();
    });

    it('10: lo mismo si lo que falla es saber a quién ya se invitó', async () => {
      mockListFriends.mockResolvedValue({
        friendships: [{ otherUserId: 'u-1', otherUserName: 'Amigo' }],
        totalCount: 1,
      });
      mockListCompetitionInvitations.mockImplementation((_id, filtros = {}) =>
        filtros.status === 'PENDING'
          ? Promise.reject(new Error('la red'))
          : Promise.resolve({ invitations: [], totalCount: 0 })
      );

      await abreElModal();

      expect(await screen.findByTestId('friends-eligibility-error')).toBeInTheDocument();
      expect(screen.queryByTestId('invite-friend-u-1')).not.toBeInTheDocument();
    });

    it('11: si lo que falla son los amigos, el aviso es el suyo', async () => {
      mockListFriends.mockRejectedValue(new Error('la red'));

      await abreElModal();

      expect(await screen.findByTestId('friends-error')).toBeInTheDocument();
      expect(screen.queryByTestId('friends-eligibility-error')).not.toBeInTheDocument();
    });
  });
});
