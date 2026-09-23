import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

/**
 * El acceso a la sala de draft desde la ficha (FE #653).
 *
 * La ceremonia la ve el grupo entero, no solo los dos capitanes, así que el
 * enlace no puede vivir escondido entre las acciones del organizador. Y deja
 * de tener sentido en cuanto los equipos están hechos: la sala ya terminó y
 * los equipos se ven en la agenda.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'es' },
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      if (params?.team !== undefined) return `${key}_${params.team}`;
      return key;
    },
  }),
}));

const mockAuthUser = { id: 'org', first_name: 'Olga', last_name: 'Organiza' };
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockAuthUser, loading: false }),
}));

let mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
vi.mock('../hooks/useUserRoles', () => ({ useUserRoles: () => mockRoles }));

vi.mock('../components/layout/HeaderAuth', () => ({ default: () => <div /> }));
vi.mock('../components/competition/CompetitionGolfCoursesSection', () => ({
  default: () => <div />,
}));

const mockGetCompetitionDetail = vi.fn();
const mockListEnrollments = vi.fn();
const mockNameCaptains = vi.fn();
const mockAssignTeams = vi.fn();
const mockCloseEnrollments = vi.fn();

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...a) => mockGetCompetitionDetail(...a) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  activateCompetitionUseCase: { execute: vi.fn() },
  closeEnrollmentsUseCase: { execute: (...a) => mockCloseEnrollments(...a) },
  nameCaptainsUseCase: { execute: (...a) => mockNameCaptains(...a) },
  startCompetitionUseCase: { execute: vi.fn() },
  completeCompetitionUseCase: { execute: vi.fn() },
  cancelCompetitionUseCase: { execute: vi.fn() },
  deleteCompetitionUseCase: { execute: vi.fn() },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  revertCompetitionToInProgressUseCase: { execute: vi.fn() },
  listEnrollmentsUseCase: { execute: (...a) => mockListEnrollments(...a) },
  requestEnrollmentUseCase: { execute: vi.fn() },
  approveEnrollmentUseCase: { execute: vi.fn() },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: (...a) => mockAssignTeams(...a) },
  setCustomHandicapUseCase: { execute: vi.fn() },
  removeCustomHandicapUseCase: { execute: vi.fn() },
  setNamePreferenceUseCase: { execute: vi.fn() },
}));

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

const inscrito = (userId, userName) => ({
  id: `enr-${userId}`,
  userId,
  status: 'APPROVED',
  userName,
  userHandicap: 10,
  hasCustomHandicap: false,
  customHandicap: null,
  team: null,
});

const INSCRITOS = [
  inscrito('org', 'Olga Organiza'),
  inscrito('ana', 'Ana Alba'),
  inscrito('bea', 'Bea Blanco'),
  inscrito('carla', 'Carla Cruz'),
];

const competicion = (extra = {}) => ({
  id: 'comp-1',
  name: 'Ryder de los amigos',
  status: 'ACTIVE',
  creatorId: 'org',
  maxPlayers: 20,
  countries: [],
  team1Name: 'Europa',
  team2Name: 'América',
  teamAssignment: 'MANUAL',
  captains: { teamA: null, teamB: null, viceTeamA: null, viceTeamB: null },
  ...extra,
});


const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('CompetitionDetail · el acceso a la sala de draft (FE #653)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockListEnrollments.mockResolvedValue(INSCRITOS);
  });

  const CERRADA_CON_CAPITANES = {
    status: 'CLOSED',
    setupMode: 'RYDER_CUP',
    teamsAssigned: false,
    captains: { teamA: 'ana', teamB: 'bea', viceTeamA: null, viceTeamB: null },
  };

  it('S1: a quien organiza, la sala es su siguiente paso', async () => {
    // No se le repite el enlace grande: para él la sala ES lo que toca ahora,
    // y ofrecerla dos veces es lo que venía a arreglar el FE #705
    mockGetCompetitionDetail.mockResolvedValue(competicion(CERRADA_CON_CAPITANES));
    renderPage();

    expect(await screen.findByTestId('accion-principal')).toHaveTextContent('draft.open');
    expect(screen.queryByTestId('ir-a-la-sala-de-draft')).not.toBeInTheDocument();
  });

  it('S1b: y a quien solo mira, el enlace de siempre', async () => {
    // La ceremonia se ve en directo desde el móvil de todo el grupo (FE #653)
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ ...CERRADA_CON_CAPITANES, creatorId: 'otra-persona' })
    );
    renderPage();

    const enlace = await screen.findByTestId('ir-a-la-sala-de-draft');
    expect(enlace).toHaveAttribute('href', '/competitions/comp-1/draft');
  });

  it('S2: y lo ve cualquiera, no solo el organizador', async () => {
    // Es la gracia del draft: el grupo entero pendiente del móvil
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ ...CERRADA_CON_CAPITANES, creatorId: 'otro' })
    );
    renderPage();

    expect(await screen.findByTestId('ir-a-la-sala-de-draft')).toBeInTheDocument();
  });

  it('S3: sin capitanes todavía no hay sala que ofrecer', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ ...CERRADA_CON_CAPITANES, captains: { teamA: null, teamB: null } })
    );
    renderPage();

    await screen.findByText('Ryder de los amigos');
    expect(screen.queryByTestId('ir-a-la-sala-de-draft')).not.toBeInTheDocument();
  });

  it('S4: con los equipos ya hechos, la sala terminó y el enlace se retira', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ ...CERRADA_CON_CAPITANES, teamsAssigned: true })
    );
    renderPage();

    await screen.findByText('Ryder de los amigos');
    expect(screen.queryByTestId('ir-a-la-sala-de-draft')).not.toBeInTheDocument();
  });

  it('S5: en modo manual no hay draft, así que tampoco sala', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ ...CERRADA_CON_CAPITANES, setupMode: 'MANUAL' })
    );
    renderPage();

    await screen.findByText('Ryder de los amigos');
    expect(screen.queryByTestId('ir-a-la-sala-de-draft')).not.toBeInTheDocument();
  });

  it('S6: con las inscripciones abiertas tampoco: la plantilla aún puede crecer', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ ...CERRADA_CON_CAPITANES, status: 'ACTIVE' })
    );
    renderPage();

    await screen.findByText('Ryder de los amigos');
    expect(screen.queryByTestId('ir-a-la-sala-de-draft')).not.toBeInTheDocument();
  });
});
