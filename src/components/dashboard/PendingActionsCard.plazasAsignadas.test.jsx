import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PendingActionsCard from './PendingActionsCard';
import mockToast from '../../utils/toast';

/**
 * La plaza asignada desde una lista de espera (FE #824, PR 4; RyderCupAm#512).
 * Sin correo: el jugador se entera aquí, hasta que pulsa «Entendido».
 *
 *   #    caso                                   | qué pasa
 *   -----|------------------------------------------|------------------------------
 *   16   una plaza asignada                       | una fila con la franja, el día y la competición
 *   16b  pulsarla                                 | a la competición
 *   17   «Entendido»                              | se va la fila, sin ir a ningún sitio
 *   17b  «Entendido» falla                        | la fila se queda y se dice
 *   18   la lectura falla                         | lo demás se enseña igual
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
const mockListMyAssignedPlaces = vi.fn();
const mockAcknowledge = vi.fn();
vi.mock('../../utils/toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => mockListMyInvitations(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  getScheduleUseCase: { execute: (...args) => mockGetSchedule(...args) },
  listPendingFriendRequestsUseCase: { execute: (...args) => mockListPendingFriendRequests(...args) },
  listMyQuickMatchesUseCase: { execute: (...args) => mockListMyQuickMatches(...args) },
  listMyPendingEnvelopesUseCase: { execute: (...args) => mockListMyPendingEnvelopes(...args) },
  listMySessionsWithoutMatchesUseCase: { execute: (...args) => mockListMySessionsWithoutMatches(...args) },
  listMyAssignedPlacesUseCase: { execute: (...args) => mockListMyAssignedPlaces(...args) },
  acknowledgeAssignedPlaceUseCase: { execute: (...args) => mockAcknowledge(...args) },
}));

const baseUser = {
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  roles: [{ name: 'PLAYER' }],
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

describe('PendingActionsCard · plaza asignada desde la espera (FE #824)', () => {
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
    mockListMyAssignedPlaces.mockResolvedValue([]);
    mockAcknowledge.mockResolvedValue();
  });

  const PLAZA = {
    competitionId: 'c1',
    competitionName: 'Medal de octubre',
    roundId: 'r1',
    roundDate: '2030-10-12',
    sessionType: 'MORNING',
    firstTeeTime: '08:00',
    assignedAt: '2030-10-01T10:00:00Z',
  };

  it('16: una fila con la franja, el día y la competición', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    renderCard();

    const fila = await screen.findByTestId('plaza-asignada-r1');
    expect(fila).toHaveTextContent('pendingActions.placeAssigned');
    expect(fila).toHaveTextContent('nextMatch.session.MORNING');
    expect(fila).toHaveTextContent('Medal de octubre');
  });

  it('16b: pulsarla lleva a la competición', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    renderCard();

    fireEvent.click(await screen.findByTestId('plaza-asignada-ir-r1'));

    expect(mockNavigate).toHaveBeenCalledWith('/competitions/c1');
  });

  it('17: «Entendido» la quita sin ir a ningún sitio', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'pendingActions.placeAssignedOk' }));

    await vi.waitFor(() => expect(screen.queryByTestId('plaza-asignada-r1')).toBeNull());
    expect(mockAcknowledge).toHaveBeenCalledWith('r1');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('17b: si «Entendido» falla, la fila se queda y se dice', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    mockAcknowledge.mockRejectedValue(new Error('sin red'));
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'pendingActions.placeAssignedOk' }));

    await vi.waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(screen.getByTestId('plaza-asignada-r1')).toBeInTheDocument();
  });

  it('17c: un doble toque en «Entendido» manda uno solo (revisor)', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    mockAcknowledge.mockReturnValue(new Promise(() => {}));
    renderCard();

    const ok = await screen.findByRole('button', { name: 'pendingActions.placeAssignedOk' });
    fireEvent.click(ok);
    fireEvent.click(ok);

    expect(mockAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('17d: el botón se toca con el dedo: 44 px', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    renderCard();

    expect((await screen.findByRole('button', { name: 'pendingActions.placeAssignedOk' })).className).toContain('min-h-11');
  });

  it('17e: un «Entendido» que acaba con la tarjeta ya desmontada no escribe la memoria (/code-review)', async () => {
    const memoria = await import('../../services/accionesPendientes');
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    let acaba;
    mockAcknowledge.mockReturnValue(new Promise((r) => { acaba = r; }));
    const { unmount } = renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'pendingActions.placeAssignedOk' }));

    unmount();
    memoria.olvidaLasAccionesPendientes();
    acaba();
    await new Promise((r) => setTimeout(r, 0));

    expect(memoria.loQueSeEnseñoAntes()).toBeNull();
  });

  it('17f: si falla «Entendido», el aviso es el nuestro, traducido (CodeRabbit)', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    mockAcknowledge.mockRejectedValue(new Error('Internal Server Error'));
    renderCard();

    fireEvent.click(await screen.findByRole('button', { name: 'pendingActions.placeAssignedOk' }));

    await vi.waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('pendingActions.placeAssignedOkFailed'));
  });

  it('19: al cambiar de cuenta no se ven, ni un momento, las plazas de la anterior (CodeRabbit)', async () => {
    mockListMyAssignedPlaces.mockResolvedValue([PLAZA]);
    const { rerender } = renderCard();
    await screen.findByTestId('plaza-asignada-r1');
    // La de la cuenta nueva no ha contestado todavía
    mockListMyAssignedPlaces.mockReturnValue(new Promise(() => {}));

    rerender(
      <MemoryRouter>
        <PendingActionsCard user={{ ...baseUser, id: 'otra-cuenta' }} competitions={[]} upcomingMatches={0} />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('plaza-asignada-r1')).toBeNull();
  });

  it('18: si la lectura falla, lo demás se enseña igual', async () => {
    mockListMyAssignedPlaces.mockRejectedValue(new Error('sin red'));
    mockListMyInvitations.mockResolvedValue({ invitations: [{ id: 'i1' }] });
    renderCard();

    expect(await screen.findAllByText(/pendingActions/)).not.toHaveLength(0);
    expect(screen.queryByTestId(/^plaza-asignada-/)).toBeNull();
  });
});
