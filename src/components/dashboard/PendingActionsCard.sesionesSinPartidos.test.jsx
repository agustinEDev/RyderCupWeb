import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PendingActionsCard from './PendingActionsCard';

/**
 * Las sesiones que se quedaron sin partidos al abrir los sobres (BE #361).
 *
 * El organizador se enteraría a la hora de jugar: los partidos se crean solos
 * al abrirse, y cuando no pueden crearse nadie está mirando.
 *
 *   #   caso                                    | qué pasa
 *   ----|---------------------------------------|---------------------------------
 *   D1  una sesión sin partidos                 | una fila, con el día y la competición
 *   D2  pulsarla                                | al calendario de esa competición
 *   D3  no hay ninguna                          | ni fila
 *   D4  la llamada falla                        | lo demás se enseña igual
 *   D5  revienta en síncrono                     | lo demás se enseña igual
 *   D6  quien no organiza nada                   | ni pregunta
 *   D7  quien creó alguna, aunque sin el rol     | sí
 */

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
const mockListMyPendingEnvelopes = vi.fn();
const mockListMySessionsWithoutMatches = vi.fn();

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => mockListMyInvitations(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  getScheduleUseCase: { execute: (...args) => mockGetSchedule(...args) },
  listPendingFriendRequestsUseCase: { execute: (...args) => mockListPendingFriendRequests(...args) },
  listMyQuickMatchesUseCase: { execute: (...args) => mockListMyQuickMatches(...args) },
  listMyPendingEnvelopesUseCase: { execute: (...args) => mockListMyPendingEnvelopes(...args) },
  listMySessionsWithoutMatchesUseCase: { execute: (...args) => mockListMySessionsWithoutMatches(...args) },
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

describe('PendingActionsCard · sesiones sin partidos', () => {
  beforeEach(async () => {
    const { olvidaLasAccionesPendientes } = await import('../../services/accionesPendientes');
    olvidaLasAccionesPendientes();
    vi.clearAllMocks();
    mockListMyInvitations.mockResolvedValue({ invitations: [] });
    mockListEnrollments.mockResolvedValue([]);
    mockListPendingFriendRequests.mockResolvedValue({ totalCount: 0 });
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [] });
    mockListMyPendingEnvelopes.mockResolvedValue([]);
    mockListMySessionsWithoutMatches.mockResolvedValue([]);
  });

  const SESION = {
    roundId: 'r1',
    competitionId: 'c1',
    competitionName: 'Ryder de Octubre',
    roundDate: '2026-10-03',
    sessionType: 'MORNING',
    reason: 'PLAYERS_WITHOUT_TEE',
    players: [{ userId: 'u1', name: 'Bea Dos', missing: 'GENDER', teeColor: null }],
  };

  it('D1: una fila por sesión, con el día y la competición', async () => {
    mockListMySessionsWithoutMatches.mockResolvedValue([SESION]);
    renderCard(creatorUser);

    const fila = await screen.findByTestId('sesion-sin-partidos-r1');
    expect(fila).toHaveTextContent('pendingActions.sessionWithoutMatches');
    expect(fila).toHaveTextContent('Ryder de Octubre');
    expect(fila).toHaveTextContent('nextMatch.session.MORNING');
  });

  it('D2: pulsarla lleva al calendario de esa competición', async () => {
    mockListMySessionsWithoutMatches.mockResolvedValue([SESION]);
    renderCard(creatorUser);

    fireEvent.click(await screen.findByTestId('sesion-sin-partidos-r1'));

    expect(mockNavigate).toHaveBeenCalledWith('/creator/competitions/c1/schedule');
  });

  it('D3: sin ninguna no hay fila', async () => {
    mockListMyInvitations.mockResolvedValue({ invitations: [{ id: 'i1' }] });
    renderCard(creatorUser);

    await screen.findAllByText(/pendingActions/);
    expect(screen.queryByTestId(/sesion-sin-partidos-/)).not.toBeInTheDocument();
  });

  it('D4: si esa llamada falla, lo demás se enseña igual', async () => {
    mockListMySessionsWithoutMatches.mockRejectedValue(new TypeError('Sin conexión'));
    mockListMyPendingEnvelopes.mockResolvedValue([
      { roundId: 'r9', competitionId: 'c9', competitionName: 'Otra', roundDate: '2026-10-04', sessionType: 'AFTERNOON' },
    ]);
    renderCard(creatorUser);

    expect(await screen.findByTestId('sobre-pendiente-r9')).toBeInTheDocument();
  });

  it('D5: y si revienta antes de pedir nada, también', async () => {
    // Un fallo síncrono —un caso de uso a medio montar— no puede llevarse por
    // delante las invitaciones y los sobres de todo el mundo
    mockListMySessionsWithoutMatches.mockImplementation(() => {
      throw new TypeError('no es una función');
    });
    mockListMyPendingEnvelopes.mockResolvedValue([
      { roundId: 'r9', competitionId: 'c9', competitionName: 'Otra', roundDate: '2026-10-04', sessionType: 'AFTERNOON' },
    ]);
    renderCard(creatorUser);

    expect(await screen.findByTestId('sobre-pendiente-r9')).toBeInTheDocument();
  });

  it('D6: quien no organiza nada ni siquiera pregunta', async () => {
    // Cada vuelta a Inicio de cada jugador era una petición más contra el
    // límite compartido, para una respuesta que para él siempre es vacía
    mockListMyInvitations.mockResolvedValue({ invitations: [{ id: 'i1' }] });
    renderCard(baseUser, []);

    await screen.findAllByText(/pendingActions/);
    expect(mockListMySessionsWithoutMatches).not.toHaveBeenCalled();
  });

  it('D7: quien ha creado alguna competición sí, aunque no tenga el rol', async () => {
    // La tarjeta recibe las competiciones que CREÓ quien mira (`findByCreator`)
    mockListMySessionsWithoutMatches.mockResolvedValue([SESION]);
    renderCard(baseUser, [{ id: 'c1' }]);

    expect(await screen.findByTestId('sesion-sin-partidos-r1')).toBeInTheDocument();
  });
});

