import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import customToast from '../utils/toast';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'es' },
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      if (params?.handicap !== undefined) return `${key}_${params.handicap}`;
      if (params?.fecha !== undefined) return `${key}_${params.fecha}`;
      return key;
    },
  }),
}));

const mockAuthUser = { id: 'player-1', first_name: 'Test', last_name: 'Player', handicap: 12 };

// Refrescar la sesión crea un `user` nuevo con el mismo id: se simula dando
// uno nuevo en cada render (CodeRabbit en la #720)
let userCambiante = false;
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: userCambiante ? { ...mockAuthUser } : mockAuthUser,
    loading: false,
  }),
}));

vi.mock('../hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    isAdmin: false,
    isCreator: false,
    isLoading: false,
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({
  default: ({ backTo }) => <div data-testid="header-auth" data-back-to={backTo}>Header</div>,
}));

vi.mock('../components/competition/CompetitionGolfCoursesSection', () => ({
  default: () => <div data-testid="golf-courses-section" />,
}));

// Las franjas: la ficha recibe la agenda de su bloque (onAgenda)
let agenda = { rounds: [] };
let agendaFallo = false;
vi.mock('../components/competition/FranjasDeLaCompeticion', async () => {
  const { useEffect } = await import('react');
  const Franjas = ({ onAgenda }) => {
    useEffect(() => {
      onAgenda?.(agenda, agendaFallo);
    }, [onAgenda]);
    return <div data-testid="franjas" />;
  };
  return { default: Franjas };
});

const mockGetCompetitionDetail = vi.fn().mockResolvedValue({
  id: 'comp-1',
  name: 'Summer Cup',
  status: 'ACTIVE',
  creatorId: 'creator-1',
  maxPlayers: 20,
  countries: [],
  visibility: 'PUBLIC',
});

const mockCloseEnrollments = vi.fn();
const orden = [];
const mockRequest = vi.fn(async () => orden.push('plaza'));
const mockGuardarGenero = vi.fn(async () => orden.push('genero'));
const mockRefrescarSesion = vi.fn(async () => orden.push('sesion'));
let faltaGenero = false;
vi.mock('../hooks/useGeneroParaApuntarse', () => ({
  useGeneroParaApuntarse: () => ({
    falta: faltaGenero,
    guardar: mockGuardarGenero,
    refrescar: mockRefrescarSesion,
  }),
}));
const mockDelete = vi.fn();
const mockCancel = vi.fn();
const mockAssignTeams = vi.fn();
const mockRevertToInProgress = vi.fn();

const mockListEnrollments = vi.fn().mockResolvedValue([
  {
    id: 'enrollment-1',
    status: 'APPROVED',
    userName: 'Jugador Uno',
    userHandicap: 18.4,
    hasCustomHandicap: false,
    customHandicap: null,
    team: null,
  },
]);

const mockSetNamePreference = vi.fn().mockResolvedValue({});
const mockSetCustomHandicap = vi.fn().mockResolvedValue({});
const mockRemoveCustomHandicap = vi.fn().mockResolvedValue({});

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...args) => mockGetCompetitionDetail(...args) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  activateCompetitionUseCase: { execute: vi.fn() },
  closeEnrollmentsUseCase: { execute: (...args) => mockCloseEnrollments(...args) },
  startCompetitionUseCase: { execute: vi.fn() },
  completeCompetitionUseCase: { execute: vi.fn() },
  cancelCompetitionUseCase: { execute: (...args) => mockCancel(...args) },
  deleteCompetitionUseCase: { execute: (...args) => mockDelete(...args) },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  revertCompetitionToInProgressUseCase: { execute: (...args) => mockRevertToInProgress(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  requestEnrollmentUseCase: { execute: (...args) => mockRequest(...args) },
  approveEnrollmentUseCase: { execute: vi.fn() },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: (...args) => mockAssignTeams(...args) },
  setCustomHandicapUseCase: { execute: (...args) => mockSetCustomHandicap(...args) },
  removeCustomHandicapUseCase: { execute: (...args) => mockRemoveCustomHandicap(...args) },
  setNamePreferenceUseCase: { execute: (...args) => mockSetNamePreference(...args) },
}));

vi.mock('../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));



const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

/**
 * Apuntarse a una pública entra directamente (release social 3, 28 oct 2026).
 */
const FRANJA = {
  id: 'r1',
  roundDate: '2027-03-03',
  sessionType: 'MORNING',
  teeSheet: { firstTeeTime: '09:00', lastTeeTime: '10:00', capacity: 8, placesTaken: 8, waitingCount: 1 },
};

const ficha = (extra = {}) => ({
  id: 'comp-1',
  name: 'Summer Cup',
  status: 'ACTIVE',
  creatorId: 'creator-1',
  maxPlayers: 20,
  countries: [],
  visibility: 'PUBLIC',
  ...extra,
});

const apuntarse = async () => {
  fireEvent.click(await screen.findByText('detail.actions.request-to-join'));
};

describe('CompetitionDetail · apuntarse a una pública', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agenda = { rounds: [] };
    agendaFallo = false;
    mockListEnrollments.mockResolvedValue([]);
  });

  it('D1: en una Ryder entra con su barra y se le dice que ya está inscrito', async () => {
    mockGetCompetitionDetail.mockResolvedValue(ficha());
    mockRequest.mockResolvedValue({ status: 'APPROVED', waiting: false, roundId: null });
    renderPage();

    await apuntarse();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith('comp-1', null, {
        color: null,
        roundId: null,
        waitingList: false,
      })
    );
    await waitFor(() => expect(customToast.success).toHaveBeenCalledWith('detail.success.enrolled'));
  });

  it('D6: en un stroke play elige la espera de una franja llena', async () => {
    agenda = { rounds: [FRANJA] };
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    mockRequest.mockResolvedValue({ status: 'APPROVED', waiting: true, roundId: 'r1' });
    renderPage();

    await apuntarse();
    fireEvent.click(await screen.findByTestId('franja-r1'));
    fireEvent.click(screen.getByText('competitions:enrollment.joinWaitingList'));

    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith('comp-1', null, {
        color: null,
        roundId: 'r1',
        waitingList: true,
      })
    );
    await waitFor(() =>
      expect(customToast.success).toHaveBeenCalledWith('detail.success.joinedWaitingList')
    );
  });

  it('D5: si la franja se llenó entre medias se dice en el diálogo', async () => {
    mockGetCompetitionDetail.mockResolvedValue(ficha());
    mockRequest.mockRejectedValue(Object.assign(new Error('x'), { status: 409, errorCode: 'TEE_WINDOW_FULL' }));
    renderPage();

    await apuntarse();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    expect(await screen.findByTestId('apuntarse-error')).toHaveTextContent(
      'detail.errors.teeWindowFull'
    );
  });

  it('T6: con la sala de draft abierta se dice en el diálogo', async () => {
    mockGetCompetitionDetail.mockResolvedValue(ficha());
    mockRequest.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, errorCode: 'DRAFT_IN_PROGRESS' })
    );
    renderPage();

    await apuntarse();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    expect(await screen.findByTestId('apuntarse-error')).toHaveTextContent(
      'detail.errors.draftInProgress'
    );
  });

  it('con franjas el máximo de jugadores no quita el botón (revisor)', async () => {
    agenda = { rounds: [FRANJA] };
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        maxPlayers: 1,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    mockListEnrollments.mockResolvedValue([
      { id: 'e9', userId: 'otro', status: 'APPROVED', userName: 'Otro' },
    ]);
    renderPage();

    expect(await screen.findByText('detail.actions.request-to-join')).toBeInTheDocument();
  });

  it('mientras se lee la agenda se dice que se están cargando, sin error (code-review)', async () => {
    agenda = null;
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    renderPage();

    await apuntarse();

    expect(screen.getByTestId('franjas-cargando')).toBeInTheDocument();
    expect(screen.queryByTestId('franjas-sin-cargar')).not.toBeInTheDocument();
    expect(screen.getByText('competitions:enrollment.confirm')).toBeDisabled();
  });

  it('sin la agenda leída no deja enviar: no hay franjas que elegir (revisor)', async () => {
    agenda = null;
    agendaFallo = true;
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    renderPage();

    await apuntarse();

    expect(screen.getByTestId('franjas-sin-cargar')).toBeInTheDocument();
    expect(screen.getByText('competitions:enrollment.confirm')).toBeDisabled();
  });

  it('al elegir otra franja se va el error de antes (revisor)', async () => {
    agenda = { rounds: [FRANJA, { ...FRANJA, id: 'r2', teeSheet: { ...FRANJA.teeSheet, placesTaken: 0, firstTeeTime: '11:00', lastTeeTime: '11:00' } }] };
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    mockRequest.mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, errorCode: 'TEE_WINDOW_FULL' })
    );
    renderPage();

    await apuntarse();
    fireEvent.click(await screen.findByTestId('franja-r2'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));
    expect(await screen.findByTestId('apuntarse-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('franja-r1'));

    expect(screen.queryByTestId('apuntarse-error')).not.toBeInTheDocument();
  });

  it('quien solo espera lo ve en su estado, no como inscrito (revisor)', async () => {
    agenda = {
      rounds: [{ ...FRANJA, teeSheet: { ...FRANJA.teeSheet, playerIds: [], myWaitingPosition: 2 } }],
    };
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    mockListEnrollments.mockResolvedValue([
      { id: 'e1', userId: 'player-1', status: 'APPROVED', userName: 'Test Player' },
    ]);
    renderPage();

    expect(await screen.findByTestId('estado-en-espera')).toHaveTextContent(
      'detail.waitingListStatus'
    );
  });

  it('sin el puesto del servidor, el de la lista (code-review)', async () => {
    agenda = {
      rounds: [
        {
          ...FRANJA,
          teeSheet: { ...FRANJA.teeSheet, playerIds: [], waitingIds: ['x', 'player-1'], myWaitingPosition: null },
        },
      ],
    };
    mockGetCompetitionDetail.mockResolvedValue(
      ficha({
        tournamentType: 'MEDAL',
        hasTeams: false,
        strokePlay: { categoryLimits: [], maxMatchdaysPerPlayer: 1 },
      })
    );
    mockListEnrollments.mockResolvedValue([
      { id: 'e1', userId: 'player-1', status: 'APPROVED', userName: 'Test Player' },
    ]);
    renderPage();

    expect(await screen.findByTestId('estado-en-espera')).toBeInTheDocument();
  });

  it('ya inscrito (409 sin código) cierra y pone la ficha al día, como antes', async () => {
    mockGetCompetitionDetail.mockResolvedValue(ficha());
    mockRequest.mockRejectedValue(Object.assign(new Error('x'), { status: 409 }));
    renderPage();

    await apuntarse();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() =>
      expect(screen.queryByText('competitions:enrollment.confirm')).not.toBeInTheDocument()
    );
    await waitFor(() => expect(mockGetCompetitionDetail.mock.calls.length).toBeGreaterThan(1));
  });
});
