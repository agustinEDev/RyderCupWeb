import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

/**
 * Caso 13 de la PR 3 (FE #824): un Stableford o un Medal se cierra con
 * «Cerrar inscripciones». En la ficha solo se ofrecía con los equipos ya
 * repartidos (una Ryder reabierta), y en una Ryder abierta lo sustituye
 * «Nombrar capitanes»: un stroke play no tenía forma de cerrar.
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
  // Una sesión: sin ninguna, iniciar no se ofrece (FE #710)
  getScheduleUseCase: {
    execute: vi.fn().mockResolvedValue({
      teamAssignment: null,
      rounds: [{ id: 'r1', roundDate: '2026-10-03', sessionType: 'MORNING', matchFormat: 'SINGLES', status: 'PENDING_TEAMS', matches: [] }],
    }),
  },
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
  hasTeams: true,
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


// Desde FE #705 la ficha ofrece UNA acción y el resto vive en el menú «···»:
// para tocarlas hay que abrirlo primero. Tolerante a que no exista, porque
// algunos casos comprueban justo que la acción NO se ofrece
const abrirMenuDeAcciones = () => {
  for (const boton of screen.queryAllByTestId('menu-acciones')) {
    if (boton.getAttribute('aria-expanded') === 'false') fireEvent.click(boton);
  }
};


describe('CompetitionDetail · cerrar un Stableford o un Medal (FE #824)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockListEnrollments.mockResolvedValue(INSCRITOS);
    mockCloseEnrollments.mockResolvedValue({ id: 'comp-1', status: 'CLOSED' });
  });

  it.each(['STABLEFORD', 'MEDAL'])('13: con las inscripciones abiertas, un %s ofrece cerrarlas', async (tipo) => {
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ hasTeams: false, tournamentType: tipo, team1Name: null, team2Name: null, teamAssignment: null })
    );
    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    fireEvent.click(await screen.findByText('detail.actions.close-enrollments'));
    // Se confirma en el modal de la app (FE #730)
    fireEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(mockCloseEnrollments).toHaveBeenCalledWith('comp-1'));
    expect(screen.queryByText('detail.actions.nameCaptains')).toBeNull();
  });

  it('13b: una Ryder abierta sigue cerrándose al nombrar a los capitanes', async () => {
    mockGetCompetitionDetail.mockResolvedValue(competicion());
    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();

    expect(await screen.findByText('detail.actions.nameCaptains')).toBeInTheDocument();
    expect(screen.queryByText('detail.actions.close-enrollments')).toBeNull();
  });
});

describe('CompetitionDetail · las franjas en la ficha (FE #824)', () => {
  const stableford = (extra = {}) =>
    competicion({ hasTeams: false, tournamentType: 'STABLEFORD', team1Name: null, team2Name: null, teamAssignment: null, ...extra });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockListEnrollments.mockResolvedValue(INSCRITOS);
  });

  it('un Stableford enseña sus franjas, no la agenda de la Ryder', async () => {
    mockGetCompetitionDetail.mockResolvedValue(stableford());
    renderPage();

    expect(await screen.findByTestId('franjas')).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-anadir')).toBeNull();
  });

  it('una Ryder sigue con su agenda', async () => {
    mockGetCompetitionDetail.mockResolvedValue(competicion());
    renderPage();

    await screen.findByTestId('seccion-agenda');
    expect(screen.queryByTestId('franjas')).toBeNull();
  });

  it.each(['DRAFT', 'ACTIVE', 'CLOSED'])('10: en %s el organizador las toca', async (status) => {
    mockGetCompetitionDetail.mockResolvedValue(stableford({ status }));
    renderPage();

    expect(await screen.findByRole('button', { name: 'franjas.add' })).toBeInTheDocument();
  });

  it.each(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])('10: en %s ya no se tocan', async (status) => {
    mockGetCompetitionDetail.mockResolvedValue(stableford({ status }));
    renderPage();

    // Con la agenda ya leída: antes de leerla tampoco se ofrece nada (revisor)
    await screen.findByTestId('franja-r1');
    expect(screen.queryByRole('button', { name: 'franjas.add' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^franjas\.change/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^franjas\.remove/ })).toBeNull();
  });

  it('cerrada, el paso principal es iniciar, y no se ofrece la agenda de la Ryder', async () => {
    mockGetCompetitionDetail.mockResolvedValue(stableford({ status: 'CLOSED' }));
    renderPage();

    await screen.findByTestId('franja-r1');
    expect(await screen.findByRole('button', { name: 'detail.actions.start-competition' })).toBeInTheDocument();
    abrirMenuDeAcciones();
    expect(screen.queryByText('detail.actions.manageSchedule')).toBeNull();
  });

  it('un jugador apuntado no tiene «Ver agenda» (la de la Ryder)', async () => {
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(
      stableford({ status: 'CLOSED', creatorId: 'otro', enrollment_status: 'APPROVED' })
    );
    renderPage();

    await screen.findByTestId('franja-r1');
    expect(screen.queryByText('detail.actions.viewSchedule')).toBeNull();
  });
});
