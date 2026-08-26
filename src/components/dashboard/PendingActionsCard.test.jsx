import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PendingActionsCard from './PendingActionsCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined && params?.name) return `${key}_${params.count}_${params.name}`;
      if (params?.count !== undefined) return `${key}_${params.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, whileHover, whileTap, ...rest }) => {
      void initial; void animate; void transition; void whileHover; void whileTap;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockListMyInvitations = vi.fn();
const mockListEnrollments = vi.fn();
const mockGetSchedule = vi.fn();
const mockListPendingFriendRequests = vi.fn();
const mockListMyQuickMatches = vi.fn();

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => mockListMyInvitations(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  getScheduleUseCase: { execute: (...args) => mockGetSchedule(...args) },
  listPendingFriendRequestsUseCase: { execute: (...args) => mockListPendingFriendRequests(...args) },
  listMyQuickMatchesUseCase: { execute: (...args) => mockListMyQuickMatches(...args) },
}));

const baseUser = {
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  roles: [{ name: 'PLAYER' }],
};

const creatorUser = {
  ...baseUser,
  roles: [{ name: 'CREATOR' }],
};

const renderCard = (user = baseUser, competitions = [], upcomingMatches = 0) => {
  return render(
    <MemoryRouter>
      <PendingActionsCard
        user={user}
        competitions={competitions}
        upcomingMatches={upcomingMatches}
      />
    </MemoryRouter>
  );
};

describe('PendingActionsCard', () => {
  beforeEach(async () => {
    // La memoria de lo ultimo enseñado vive en un modulo y se colaba de un test
    // al siguiente: uno pasaba solo porque el anterior dejaba ceros puestos
    const { olvidaLasAccionesPendientes } = await import('../../services/accionesPendientes');
    olvidaLasAccionesPendientes();
    vi.clearAllMocks();
    mockListMyInvitations.mockResolvedValue({ invitations: [], totalCount: 0 });
    mockListEnrollments.mockResolvedValue([]);
    mockGetSchedule.mockResolvedValue({ rounds: [] });
    mockListPendingFriendRequests.mockResolvedValue({ friendships: [], totalCount: 0 });
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [], totalCount: 0, page: 1, limit: 20 });
  });

  it('should show active quick matches and navigate to their scoring page', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [{ id: 'qm-1', matchFormat: 'SINGLES', status: 'IN_PROGRESS' }],
      totalCount: 1,
      page: 1,
      limit: 20,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('active-quick-match-qm-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('active-quick-match-qm-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/quick-matches/qm-1/scoring');
  });

  it('should show the quick match name instead of the format when it has one', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [{ id: 'qm-1', matchFormat: 'SINGLES', status: 'IN_PROGRESS', name: 'Viernes con Rafa' }],
      totalCount: 1,
      page: 1,
      limit: 20,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByText('Viernes con Rafa')).toBeInTheDocument();
    });
  });

  it('should not render when there are no pending items', async () => {
    renderCard();
    await waitFor(() => {
      expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
    });
  });

  it('should render pending invitations section', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        { id: 'inv-1', competitionId: 'comp-1', status: 'PENDING' },
        { id: 'inv-2', competitionId: 'comp-2', status: 'PENDING' },
      ],
      totalCount: 2,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('pending-actions-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('pending-invitations-action')).toBeInTheDocument();
  });

  it('should navigate to invitations page when clicking pending invitations', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [{ id: 'inv-1', competitionId: 'comp-1', status: 'PENDING' }],
      totalCount: 1,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('pending-invitations-action')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pending-invitations-action'));
    expect(mockNavigate).toHaveBeenCalledWith('/player/invitations');
  });

  it('should show enrollment requests for creator users', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE' },
    ];

    mockListEnrollments.mockResolvedValue([
      { id: 'enr-1', status: 'REQUESTED' },
      { id: 'enr-2', status: 'REQUESTED' },
    ]);

    renderCard(creatorUser, competitions);

    await waitFor(() => {
      expect(screen.getByTestId('pending-enrollments-action')).toBeInTheDocument();
    });
  });

  it('should not show enrollment requests for non-creator users', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE' },
    ];

    renderCard(baseUser, competitions);

    await waitFor(() => {
      expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
    });
    expect(mockListEnrollments).not.toHaveBeenCalled();
  });

  it('should navigate to competition detail when clicking enrollment action', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE' },
    ];

    mockListEnrollments.mockResolvedValue([
      { id: 'enr-1', status: 'REQUESTED' },
    ]);

    renderCard(creatorUser, competitions);

    await waitFor(() => {
      expect(screen.getByTestId('pending-enrollments-action')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pending-enrollments-action'));
    expect(mockNavigate).toHaveBeenCalledWith('/competitions/comp-1');
  });

  it('should show upcoming matches when the dashboard passes some', async () => {
    /**
     * La tarjeta ya no calcula los partidos: los recibe. El banner de proximo
     * partido mira exactamente los mismos, y cargarlos por separado duplicaba
     * las llamadas al calendario de cada competicion (FE #306).
     */
    renderCard(baseUser, [{ id: 'comp-1', name: 'Cup', status: 'IN_PROGRESS' }], 2);

    await waitFor(() => {
      expect(screen.getByTestId('upcoming-matches-action')).toBeInTheDocument();
    });
  });

  it('should not show upcoming matches when there are none', async () => {
    renderCard(baseUser, [{ id: 'comp-1', name: 'Cup', status: 'IN_PROGRESS' }], 0);

    await waitFor(() => {
      expect(screen.queryByTestId('upcoming-matches-action')).not.toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockListMyInvitations.mockRejectedValue(new Error('Network error'));

    renderCard();

    await waitFor(() => {
      expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
    });
  });

  it('should not render when user is null', () => {
    const { container } = renderCard(null);
    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * Volver a Inicio desde la barra inferior remonta el panel entero, así que sin
 * memoria esta tarjeta empezaba de cero en cada vuelta y pintaba su esqueleto
 * amarillo. Antes quedaba escondido detrás de la espera a pantalla completa del
 * panel; al quitarla (FE #495) se quedó a la vista (FE #502).
 */
describe('PendingActionsCard al volver al panel', () => {
  const memoria = () => import('../../services/accionesPendientes');

  beforeEach(async () => {
    const { olvidaLasAccionesPendientes } = await memoria();
    olvidaLasAccionesPendientes();
  });

  it('la primera vez sí enseña que está cargando', async () => {
    mockListMyQuickMatches.mockReturnValue(new Promise(() => {}));

    const { container } = renderCard();

    // El dibujo compartido, no un recuadro amarillo propio (FE #495)
    expect(container.querySelector('.espera-anillo')).not.toBeNull();
  });

  it('una respuesta que llega tras irse no escribe en la memoria', async () => {
    // Antes solo tocaba el estado de un componente muerto; ahora deja memoria
    // que pinta el SIGUIENTE montaje: aceptar unas solicitudes y volver a Inicio
    // enseñaba las de antes, ya atendidas
    const { loQueSeEnseñoAntes } = await memoria();
    let soltar;
    mockListMyQuickMatches.mockReturnValue(new Promise((r) => { soltar = () => r({ quickMatches: [{ id: 'fantasma' }] }); }));

    const { unmount } = renderCard();
    unmount();
    soltar();
    await new Promise((r) => setTimeout(r, 10));

    expect(loQueSeEnseñoAntes(), 'no puede quedar memoria de una pantalla que ya no esta').toBeNull();
  });

  it('al volver enseña lo de antes, sin esqueleto', async () => {
    const { recuerdaLasAccionesPendientes } = await memoria();
    recuerdaLasAccionesPendientes({
      pendingInvitations: 0,
      pendingEnrollments: [],
      pendingFriendRequests: 0,
      activeQuickMatches: [{ id: 'q1', name: 'Partida en curso' }],
    });
    // La recarga se queda en vuelo: lo que se vea viene de la memoria
    mockListMyQuickMatches.mockReturnValue(new Promise(() => {}));

    const { container } = renderCard();

    expect(container.querySelector('.espera-anillo'), 'no debe verse la espera').toBeNull();
  });
});
