import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

const mockAuthUser = { id: 'org-1', first_name: 'Org', last_name: 'Aniza' };

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
let faltaGenero = true;
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
  removeEnrolledPlayerUseCase: { execute: (...args) => mockQuitar(...args) },
  assignTeamsUseCase: { execute: (...args) => mockAssignTeams(...args) },
  setCustomHandicapUseCase: { execute: (...args) => mockSetCustomHandicap(...args) },
  removeCustomHandicapUseCase: { execute: (...args) => mockRemoveCustomHandicap(...args) },
  setNamePreferenceUseCase: { execute: (...args) => mockSetNamePreference(...args) },
}));

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../utils/toast', () => ({ default: mockToast }));
const mockQuitar = vi.fn();



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
 * «Quitar» a un inscrito desde la ficha (release social 2, Q1 y decisiones del 27 oct).
 *
 * | Caso                                             | Resultado                                       |
 * |--------------------------------------------------|-------------------------------------------------|
 * | Organizador, abierta, fila de otro               | Botón «Quitar»                                  |
 * | Su propia fila                                   | Sin botón                                       |
 * | Quien no organiza                                | Sin botón                                       |
 * | En juego o terminada                             | Sin botón                                       |
 * | Pulsar                                           | Confirmación con su nombre; «se le avisará»     |
 * | Con equipos formados                             | Y «se desharán los equipos»                     |
 * | Confirmar                                        | Se quita, se dice y se relee la ficha           |
 * | No confirmar                                     | Nada                                            |
 * | No se puede (su código)                          | Se dice por qué                                 |
 */
const FICHA = {
  id: 'comp-1',
  name: 'Copa X',
  status: 'ACTIVE',
  creatorId: 'org-1',
  maxPlayers: 20,
  countries: [],
  visibility: 'PUBLIC',
  teamsAssigned: false,
};
const INSCRITOS = [
  { id: 'enr-org', userId: 'org-1', status: 'APPROVED', userName: 'Org Aniza', team: null },
  { id: 'enr-pedro', userId: 'u-pedro', status: 'APPROVED', userName: 'Pedro Gil', team: null },
];

const pintaComo = async ({ ficha = {}, usuario = mockAuthUser } = {}) => {
  Object.assign(mockAuthUser, usuario);
  mockGetCompetitionDetail.mockResolvedValue({ ...FICHA, ...ficha });
  mockListEnrollments.mockResolvedValue(INSCRITOS);
  renderPage();
  await screen.findByTestId('aprobado-u-pedro');
};

describe('CompetitionDetail · quitar a un inscrito', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faltaGenero = false;
    Object.assign(mockAuthUser, { id: 'org-1' });
    mockQuitar.mockResolvedValue(undefined);
  });

  it('el organizador ve «Quitar» en la fila de otro, y no en la suya', async () => {
    await pintaComo();

    expect(screen.getByTestId('quitar-u-pedro')).toBeInTheDocument();
    expect(screen.queryByTestId('quitar-org-1')).not.toBeInTheDocument();
  });

  it('quien no organiza no lo ve', async () => {
    await pintaComo({ usuario: { id: 'u-otro' } });

    expect(screen.queryByTestId('quitar-u-pedro')).not.toBeInTheDocument();
  });

  it.each(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])('en %s no se ofrece', async (status) => {
    await pintaComo({ ficha: { status } });

    expect(screen.queryByTestId('quitar-u-pedro')).not.toBeInTheDocument();
  });

  it.each(['DRAFT', 'CLOSED'])('en %s sí', async (status) => {
    await pintaComo({ ficha: { status } });

    expect(screen.getByTestId('quitar-u-pedro')).toBeInTheDocument();
  });

  it('pregunta con su nombre y dice que se le avisará', async () => {
    await pintaComo();

    fireEvent.click(screen.getByTestId('quitar-u-pedro'));

    expect(await screen.findByText('detail.confirmDialogs.remove.title')).toBeInTheDocument();
    expect(screen.getByText('detail.confirmDialogs.remove.body')).toBeInTheDocument();
  });

  it('con equipos formados, avisa de que se desharán', async () => {
    await pintaComo({ ficha: { status: 'CLOSED', teamsAssigned: true } });

    fireEvent.click(screen.getByTestId('quitar-u-pedro'));

    expect(await screen.findByText('detail.confirmDialogs.removeWithTeams.body')).toBeInTheDocument();
  });

  it('al confirmar, le quita, lo dice y relee la ficha', async () => {
    await pintaComo();
    const leidas = mockGetCompetitionDetail.mock.calls.length;

    fireEvent.click(screen.getByTestId('quitar-u-pedro'));
    fireEvent.click(await screen.findByText('detail.confirmDialogs.remove.confirm'));

    await waitFor(() => expect(mockQuitar).toHaveBeenCalledWith('enr-pedro'));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('detail.success.playerRemoved'));
    await waitFor(() => expect(mockGetCompetitionDetail.mock.calls.length).toBeGreaterThan(leidas));
  });

  it('sin confirmar, nada', async () => {
    await pintaComo();

    fireEvent.click(screen.getByTestId('quitar-u-pedro'));
    fireEvent.click(await screen.findByText('detail.confirmDialogs.remove.keep'));

    await waitFor(() => expect(screen.queryByText('detail.confirmDialogs.remove.title')).not.toBeInTheDocument());
    expect(mockQuitar).not.toHaveBeenCalled();
  });

  it.each([
    ['PLAYER_HAS_MATCHES', 'detail.errors.removePlayerHasMatches'],
    ['DRAFT_IN_PROGRESS', 'detail.errors.removeDraftInProgress'],
    ['REMOVAL_NOT_ALLOWED', 'detail.errors.removeNotAllowed'],
    ['CANNOT_REMOVE_ORGANIZER', 'detail.errors.removeOrganizer'],
    [undefined, 'detail.errors.removeFailed'],
  ])('si no se puede (%s), dice por qué', async (errorCode, texto) => {
    mockQuitar.mockRejectedValue(Object.assign(new Error('x'), { status: 409, errorCode }));
    await pintaComo();

    fireEvent.click(screen.getByTestId('quitar-u-pedro'));
    fireEvent.click(await screen.findByText('detail.confirmDialogs.remove.confirm'));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(texto));
  });
});
