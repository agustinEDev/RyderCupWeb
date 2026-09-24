import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

/**
 * La agenda en la ficha (FE #654): el torneo es su agenda, a la vista de todos.
 *
 *   #    caso                              | qué pasa
 *   -----|---------------------------------|--------------------------------------
 *   FA1  el organizador                    | la agenda, con sus fechas y editable
 *   FA2  quien solo mira                   | la agenda, sin editar
 *   FA3  la cuenta de partidos             | con los inscritos aprobados
 *   FA6  cambian los campos en la ficha    | la agenda recibe otra `versionCampos` (FE #715)
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
const mockAgenda = vi.fn();
vi.mock('../components/competition/AgendaDeLaCompeticion', () => ({
  default: (props) => {
    mockAgenda(props);
    return <div data-testid="agenda" />;
  },
}));
const mockSeccionCampos = vi.fn();
vi.mock('../components/competition/CompetitionGolfCoursesSection', () => ({
  default: (props) => {
    mockSeccionCampos(props);
    return <div />;
  },
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

describe('CompetitionDetail · la agenda (FE #654)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockListEnrollments.mockResolvedValue(INSCRITOS);
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ startDate: '2026-10-03', endDate: '2026-10-04' })
    );
  });

  const ultimasProps = () => mockAgenda.mock.calls[mockAgenda.mock.calls.length - 1][0];

  it('FA1: el organizador la ve y la puede cambiar', async () => {
    renderPage();

    await screen.findByTestId('agenda');
    expect(ultimasProps()).toMatchObject({
      competitionId: 'comp-1',
      startDate: '2026-10-03',
      endDate: '2026-10-04',
      canManage: true,
    });
  });

  it('FA2: quien solo mira la ve sin poder cambiarla', async () => {
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ creatorId: 'otra', startDate: '2026-10-03', endDate: '2026-10-04' })
    );
    renderPage();

    await screen.findByTestId('agenda');
    expect(ultimasProps().canManage).toBe(false);
  });

  it('FA3: la cuenta de partidos va con los inscritos aprobados', async () => {
    renderPage();

    await screen.findByTestId('agenda');
    await vi.waitFor(() => expect(ultimasProps().jugadores).toBe(4));
  });

  it('FA4: cancelada o terminada no se cambia', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ status: 'CANCELLED', startDate: '2026-10-03', endDate: '2026-10-04' })
    );
    renderPage();

    await screen.findByTestId('agenda');
    expect(ultimasProps().canManage).toBe(false);
  });

  it('FA5: se vuelve a leer cuando la competición cambia', async () => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ startDate: '2026-10-03', endDate: '2026-10-04', updatedAt: '2026-09-24T07:00:00' })
    );
    renderPage();

    await screen.findByTestId('agenda');
    expect(ultimasProps().version).toContain('2026-09-24T07:00:00');
  });

  it('FA6: si la sección de campos avisa de un cambio, la agenda los vuelve a leer', async () => {
    renderPage();
    await screen.findByTestId('agenda');
    const antes = ultimasProps().versionCampos;
    const aviso = mockSeccionCampos.mock.calls[mockSeccionCampos.mock.calls.length - 1][0]
      .onCamposCambiados;

    act(() => aviso());

    expect(antes).toBeDefined();
    expect(ultimasProps().versionCampos).not.toBe(antes);
  });
});
