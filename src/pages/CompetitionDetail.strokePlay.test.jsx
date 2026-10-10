import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  // Las plazas y esperas de las franjas (FE #824, PR 4)
  takeTeeWindowPlaceUseCase: { execute: vi.fn() },
  releaseTeeWindowPlaceUseCase: { execute: vi.fn() },
  joinWaitingListUseCase: { execute: vi.fn() },
  leaveWaitingListUseCase: { execute: vi.fn() },
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
import customToast from '../utils/toast';

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

describe('CompetitionDetail · plazas en las franjas (FE #824, PR 4)', () => {
  const stableford = (extra = {}) =>
    competicion({
      hasTeams: false,
      tournamentType: 'STABLEFORD',
      team1Name: null,
      team2Name: null,
      teamAssignment: null,
      strokePlay: { categoryLimits: [], categoryCount: null, maxMatchdaysPerPlayer: 2, overallStanding: 'ACCUMULATED' },
      ...extra,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue(INSCRITOS);
  });

  it('un jugador inscrito ve sus jornadas con el máximo de la competición', async () => {
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(stableford({ creatorId: 'otra' }));
    renderPage();

    expect(await screen.findByTestId('franjas-mis-jornadas')).toHaveTextContent('franjas.myDays_2');
  });

  const conFranjas = async (rounds) => {
    const { getScheduleUseCase } = await import('../composition');
    getScheduleUseCase.execute.mockResolvedValue({ rounds, teeSheetCapacity: 8 });
  };
  const hoja = (extra = {}) => ({
    firstTeeTime: '08:00', lastTeeTime: '08:10', intervalMinutes: 10, groupSize: 4, teeTimes: [],
    capacity: 4, placesTaken: 0, playerIds: [], waitingIds: [], ...extra,
  });

  it('el jugador usa el máximo de jornadas de la competición (2): otro día, coge plaza', async () => {
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    await conFranjas([
      { id: 'a', roundDate: '2026-10-03', sessionType: 'MORNING', status: 'PENDING_MATCHES', matches: [], teeSheet: hoja({ playerIds: ['org'], placesTaken: 1 }) },
      { id: 'b', roundDate: '2026-10-04', sessionType: 'MORNING', status: 'PENDING_MATCHES', matches: [], teeSheet: hoja() },
    ]);
    mockGetCompetitionDetail.mockResolvedValue(stableford({ creatorId: 'otra', startDate: '2026-10-03', endDate: '2026-10-04' }));
    renderPage();

    const fila = await screen.findByTestId('franja-b');
    expect(within(fila).getByRole('button', { name: 'franjas.take' })).toBeInTheDocument();
  });

  it('8: con las inscripciones cerradas el jugador ya no elige', async () => {
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    await conFranjas([
      { id: 'b', roundDate: '2026-10-04', sessionType: 'MORNING', status: 'PENDING_MATCHES', matches: [], teeSheet: hoja() },
    ]);
    mockGetCompetitionDetail.mockResolvedValue(stableford({ creatorId: 'otra', status: 'CLOSED', startDate: '2026-10-03', endDate: '2026-10-04' }));
    renderPage();

    await screen.findByTestId('franja-b');
    expect(screen.queryByRole('button', { name: 'franjas.take' })).toBeNull();
  });

  it('el organizador ve a los aprobados sin franja por su nombre', async () => {
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(stableford());
    renderPage();

    const bloque = await screen.findByTestId('sin-franja');
    expect(bloque).toHaveTextContent('Ana Alba');
  });

  it('15: cerrar con jugadores sin franja los nombra y lleva a «Sin franja»', async () => {
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockGetCompetitionDetail.mockResolvedValue(stableford());
    const error = Object.assign(new Error('Faltan franjas'), {
      errorCode: 'PLAYERS_WITHOUT_TEE_WINDOW',
      data: { players: [{ user_id: 'ana', name: 'Ana Alba' }, { user_id: 'bea', name: 'Bea Blanco' }] },
    });
    mockCloseEnrollments.mockRejectedValue(error);
    const traerALaVista = vi.fn();
    globalThis.Element.prototype.scrollIntoView = traerALaVista;
    renderPage();

    await screen.findByTestId('sin-franja');
    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    fireEvent.click(await screen.findByText('detail.actions.close-enrollments'));
    fireEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('detail.errors.playersWithoutTeeWindow_2')
    );
    // El salto llega con lo releído, no al momento (CodeRabbit en la #836)
    await waitFor(() => expect(traerALaVista).toHaveBeenCalled(), { timeout: 3000 });
  });
});

describe('CompetitionDetail · cerrar sin los nombres de quien falta (FE #824)', () => {
  it('si el servidor no manda nombres, el aviso no queda vacío', async () => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockListEnrollments.mockResolvedValue(INSCRITOS);
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ hasTeams: false, tournamentType: 'STABLEFORD', team1Name: null, team2Name: null, teamAssignment: null })
    );
    mockCloseEnrollments.mockRejectedValue(
      Object.assign(new Error('Faltan'), { errorCode: 'PLAYERS_WITHOUT_TEE_WINDOW', data: { players: [{ user_id: 'x' }] } })
    );
    renderPage();

    await screen.findByTestId('menu-acciones');
    abrirMenuDeAcciones();
    fireEvent.click(await screen.findByText('detail.actions.close-enrollments'));
    fireEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('detail.errors.playersWithoutTeeWindowUnnamed'));
  });

  it('la cuenta es la de todos los que faltan, aunque alguno venga sin nombre (/code-review)', async () => {
    vi.clearAllMocks();
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    mockListEnrollments.mockResolvedValue(INSCRITOS);
    mockGetCompetitionDetail.mockResolvedValue(
      competicion({ hasTeams: false, tournamentType: 'STABLEFORD', team1Name: null, team2Name: null, teamAssignment: null })
    );
    mockCloseEnrollments.mockRejectedValue(
      Object.assign(new Error('Faltan'), {
        errorCode: 'PLAYERS_WITHOUT_TEE_WINDOW',
        data: { players: [{ user_id: 'a', name: 'Ana' }, { user_id: 'x' }, { user_id: 'b', name: 'Bea' }] },
      })
    );
    const { getScheduleUseCase } = await import('../composition');
    renderPage();

    await screen.findByTestId('menu-acciones');
    const lecturas = getScheduleUseCase.execute.mock.calls.length;
    abrirMenuDeAcciones();
    fireEvent.click(await screen.findByText('detail.actions.close-enrollments'));
    fireEvent.click(await screen.findByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('detail.errors.playersWithoutTeeWindow_3'));
    // Y las franjas se releen: lo pintado puede estar viejo
    await waitFor(() => expect(getScheduleUseCase.execute.mock.calls.length).toBeGreaterThan(lecturas));
  });
});
