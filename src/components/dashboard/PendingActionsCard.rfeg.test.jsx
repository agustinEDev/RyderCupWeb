import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PendingActionsCard from './PendingActionsCard';
import { olvidaTodo } from '../../services/loUltimoConocido';

/**
 * Los hándicaps sin actualizar con la RFEG en «Requiere tu Atención»
 * (15 nov 2026; RyderCupAm #864, GET /competitions/me/handicaps-not-updated).
 *
 *   caso                                              | qué pasa
 *   --------------------------------------------------|-------------------------------------------
 *   R1 organiza una con N sin actualizar               | «{N} jugadores sin actualizar… en {X}»
 *   R1b pulsarla                                       | a la tarjeta de hándicaps de esa competición
 *   R2 la RFEG no le encontró en una                   | «No hemos encontrado tu hándicap… {X}…»
 *   R2b pulsarla                                       | a editar el perfil
 *   R3 las dos listas vacías                           | la tarjeta no sale
 *   R4 la lectura falla                                | lo demás se enseña igual
 *   R5 se vuelve al panel                              | lo de antes se pinta al momento, sin espera
 *   R6 la siguiente lectura llega vacía                | la fila se va
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.competition !== undefined && params?.count !== undefined)
        return `${key}_${params.count}_${params.competition}`;
      if (params?.competition !== undefined)
        return `${key}_${params.competition}`;
      if (params?.count !== undefined && params?.name)
        return `${key}_${params.count}_${params.name}`;
      if (params?.count !== undefined) return `${key}_${params.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      transition,
      whileHover,
      whileTap,
      ...rest
    }) => {
      void initial;
      void animate;
      void transition;
      void whileHover;
      void whileTap;
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
const mockListMyHandicapsNotUpdated = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: {
    execute: (...args) => mockListMyInvitations(...args),
  },
  listEnrollmentsUseCase: {
    execute: (...args) => mockListEnrollments(...args),
  },
  getScheduleUseCase: { execute: (...args) => mockGetSchedule(...args) },
  listPendingFriendRequestsUseCase: {
    execute: (...args) => mockListPendingFriendRequests(...args),
  },
  listMyQuickMatchesUseCase: {
    execute: (...args) => mockListMyQuickMatches(...args),
  },
  listMyPendingEnvelopesUseCase: {
    execute: (...args) => mockListMyPendingEnvelopes(...args),
  },
  listMySessionsWithoutMatchesUseCase: {
    execute: (...args) => mockListMySessionsWithoutMatches(...args),
  },
  listMyAssignedPlacesUseCase: {
    execute: (...args) => mockListMyAssignedPlaces(...args),
  },
  acknowledgeAssignedPlaceUseCase: {
    execute: (...args) => mockAcknowledge(...args),
  },
  listMyHandicapsNotUpdatedUseCase: {
    execute: (...args) => mockListMyHandicapsNotUpdated(...args),
  },
}));

const baseUser = {
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  roles: [{ name: 'PLAYER' }],
};

const renderCard = (
  user = baseUser,
  competitions = [],
  upcomingMatches = 0,
) => {
  return render(
    <MemoryRouter>
      <PendingActionsCard
        user={user}
        competitions={competitions}
        upcomingMatches={upcomingMatches}
      />
    </MemoryRouter>,
  );
};

describe('PendingActionsCard · hándicaps sin actualizar con la RFEG', () => {
  beforeEach(async () => {
    const { olvidaLasAccionesPendientes } =
      await import('../../services/accionesPendientes');
    olvidaLasAccionesPendientes();
    olvidaTodo();
    vi.clearAllMocks();
    mockListMyInvitations.mockResolvedValue({ invitations: [] });
    mockListEnrollments.mockResolvedValue([]);
    mockListPendingFriendRequests.mockResolvedValue({ totalCount: 0 });
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [] });
    mockListMyPendingEnvelopes.mockResolvedValue([]);
    mockListMySessionsWithoutMatches.mockResolvedValue([]);
    mockListMyAssignedPlaces.mockResolvedValue([]);
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [],
      asPlayer: [],
    });
  });

  const COMO_ORGANIZADOR = {
    competitionId: 'c1',
    competitionName: 'Ryder de otoño',
    count: 3,
  };
  const COMO_JUGADOR = { competitionId: 'c2', competitionName: 'Medal' };

  it('R1: Given organiza una con 3 sin actualizar, When se pinta, Then la fila lo dice con la competición', async () => {
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [COMO_ORGANIZADOR],
      asPlayer: [],
    });
    renderCard();

    const fila = await screen.findByTestId('rfeg-sin-actualizar-c1');
    expect(fila).toHaveTextContent(
      'pendingActions.handicapsNotUpdated_3_Ryder de otoño',
    );
  });

  it('R1b: Given la fila del organizador, When la pulsa, Then va a la tarjeta de hándicaps de la competición', async () => {
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [COMO_ORGANIZADOR],
      asPlayer: [],
    });
    renderCard();

    fireEvent.click(await screen.findByTestId('rfeg-sin-actualizar-c1'));

    expect(mockNavigate).toHaveBeenCalledWith('/competitions/c1', {
      state: { verHandicaps: true },
    });
  });

  it('R2: Given la RFEG no le encontró, When se pinta, Then se le dice qué revisar', async () => {
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [],
      asPlayer: [COMO_JUGADOR],
    });
    renderCard();

    const fila = await screen.findByTestId('rfeg-no-encontrado-c2');
    expect(fila).toHaveTextContent('pendingActions.rfegHandicapNotFound_Medal');
  });

  it('R2b: Given su fila, When la pulsa, Then va a editar el perfil', async () => {
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [],
      asPlayer: [COMO_JUGADOR],
    });
    renderCard();

    fireEvent.click(await screen.findByTestId('rfeg-no-encontrado-c2'));

    expect(mockNavigate).toHaveBeenCalledWith('/profile/edit');
  });

  it('R3: Given las dos listas vacías, When se pinta, Then la tarjeta no sale', async () => {
    renderCard();

    await vi.waitFor(() =>
      expect(mockListMyHandicapsNotUpdated).toHaveBeenCalled(),
    );
    expect(screen.queryByTestId('pending-actions-card')).toBeNull();
  });

  it('R4: Given la lectura falla, When se pinta, Then lo demás sale igual', async () => {
    mockListMyHandicapsNotUpdated.mockRejectedValue(new Error('caída'));
    mockListMyInvitations.mockResolvedValue({ invitations: [{ id: 'i' }] });
    renderCard();

    expect(
      await screen.findByTestId('pending-invitations-action'),
    ).toBeInTheDocument();
  });

  it('R5: Given se vio antes, When se vuelve al panel, Then se pinta al momento sin espera', async () => {
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [COMO_ORGANIZADOR],
      asPlayer: [COMO_JUGADOR],
    });
    const primera = renderCard();
    await screen.findByTestId('rfeg-sin-actualizar-c1');
    primera.unmount();
    // La segunda lectura no llega nunca: lo que se ve es lo recordado
    mockListMyHandicapsNotUpdated.mockReturnValue(new Promise(() => {}));

    renderCard();

    expect(screen.getByTestId('rfeg-sin-actualizar-c1')).toBeInTheDocument();
    expect(screen.getByTestId('rfeg-no-encontrado-c2')).toBeInTheDocument();
  });

  it('R6: Given estaba, When la siguiente lectura llega vacía, Then la fila se va', async () => {
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [COMO_ORGANIZADOR],
      asPlayer: [],
    });
    const primera = renderCard();
    await screen.findByTestId('rfeg-sin-actualizar-c1');
    primera.unmount();
    mockListMyHandicapsNotUpdated.mockResolvedValue({
      asOrganizer: [],
      asPlayer: [],
    });

    renderCard();

    await vi.waitFor(() =>
      expect(screen.queryByTestId('rfeg-sin-actualizar-c1')).toBeNull(),
    );
  });
});
