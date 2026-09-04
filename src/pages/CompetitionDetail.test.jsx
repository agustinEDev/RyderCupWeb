import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import CompetitionDetail from './CompetitionDetail';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      if (params?.handicap !== undefined) return `${key}_${params.handicap}`;
      return key;
    },
  }),
}));

const mockAuthUser = { id: 'creator-1', first_name: 'Test', last_name: 'Creator' };

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
}));

vi.mock('../hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    isAdmin: false,
    isCreator: true,
    isLoading: false,
  }),
}));

vi.mock('../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
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
});

const mockCloseEnrollments = vi.fn();
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
  cancelCompetitionUseCase: { execute: vi.fn() },
  deleteCompetitionUseCase: { execute: vi.fn() },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  revertCompetitionToInProgressUseCase: { execute: (...args) => mockRevertToInProgress(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  requestEnrollmentUseCase: { execute: vi.fn() },
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

import customToast from '../utils/toast';

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/competitions/comp-1']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CompetitionDetail - edición de hándicap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockListEnrollments.mockResolvedValue([
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
    mockSetCustomHandicap.mockResolvedValue({});
    mockRemoveCustomHandicap.mockResolvedValue({});
  });

  it('acepta coma como separador decimal y envía el punto al backend', async () => {
    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12,5' } });

    const saveButton = screen.getByTitle('detail.saveHandicap');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSetCustomHandicap).toHaveBeenCalledWith('comp-1', 'enrollment-1', 12.5);
    });
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('sigue aceptando el punto como separador decimal', async () => {
    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '12.5' } });

    const saveButton = screen.getByTitle('detail.saveHandicap');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSetCustomHandicap).toHaveBeenCalledWith('comp-1', 'enrollment-1', 12.5);
    });
  });

  it('muestra error de validación si el valor no es un número tras normalizar', async () => {
    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });

    const saveButton = screen.getByTitle('detail.saveHandicap');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(customToast.error).toHaveBeenCalledWith('detail.invalidHandicap');
    });
    expect(mockSetCustomHandicap).not.toHaveBeenCalled();
  });

  it('no muestra el botón de editar hándicap si la competición está IN_PROGRESS', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'IN_PROGRESS',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByTitle('detail.editHandicap')).not.toBeInTheDocument();
  });

  it('muestra el botón de revertir a RFEG solo para jugadores españoles con hándicap personalizado', async () => {
    mockListEnrollments.mockResolvedValue([
      {
        id: 'enrollment-1',
        status: 'APPROVED',
        userName: 'Jugador Uno',
        userHandicap: 18.4,
        hasCustomHandicap: true,
        customHandicap: 20.0,
        userCountryCode: 'ES',
        team: null,
      },
    ]);

    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    expect(screen.getByTitle('detail.revertToRfegHandicap')).toBeInTheDocument();
  });

  it('no muestra el botón de revertir a RFEG para jugadores no españoles', async () => {
    mockListEnrollments.mockResolvedValue([
      {
        id: 'enrollment-1',
        status: 'APPROVED',
        userName: 'Jugador Uno',
        userHandicap: 18.4,
        hasCustomHandicap: true,
        customHandicap: 20.0,
        userCountryCode: 'FR',
        team: null,
      },
    ]);

    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    expect(screen.queryByTitle('detail.revertToRfegHandicap')).not.toBeInTheDocument();
  });

  it('al revertir a RFEG llama al use case y recarga los enrollments', async () => {
    mockListEnrollments.mockResolvedValue([
      {
        id: 'enrollment-1',
        status: 'APPROVED',
        userName: 'Jugador Uno',
        userHandicap: 18.4,
        hasCustomHandicap: true,
        customHandicap: 20.0,
        userCountryCode: 'ES',
        team: null,
      },
    ]);

    renderPage();

    const editButton = await screen.findByTitle('detail.editHandicap');
    fireEvent.click(editButton);

    const revertButton = screen.getByTitle('detail.revertToRfegHandicap');
    fireEvent.click(revertButton);

    await waitFor(() => {
      expect(mockRemoveCustomHandicap).toHaveBeenCalledWith('comp-1', 'enrollment-1');
    });
    expect(customToast.error).not.toHaveBeenCalled();
  });
});

describe('CompetitionDetail - cierre de inscripciones con asignación automática', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      teamAssignment: 'AUTOMATIC',
      countries: [],
    });
    mockListEnrollments.mockResolvedValue([]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('actualiza el estado a CLOSED aunque falle la asignación automática de equipos', async () => {
    mockCloseEnrollments.mockResolvedValue({ status: 'CLOSED', updatedAt: '2026-07-05T00:00:00Z' });
    mockAssignTeams.mockRejectedValue(new Error('assign failed'));

    renderPage();

    const closeButton = await screen.findByText('detail.actions.close-enrollments');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockAssignTeams).toHaveBeenCalledWith('comp-1', { mode: 'AUTOMATIC' });
    });

    // Status update from closeEnrollments must survive the assignTeams failure
    await waitFor(() => {
      expect(screen.getByText('detail.actions.start-competition')).toBeInTheDocument();
    });
    expect(customToast.error).toHaveBeenCalledWith('assign failed');
    expect(customToast.success).toHaveBeenCalledWith('detail.success.enrollmentsClosed');
  });
});

describe('CompetitionDetail - reabrir torneo completado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListEnrollments.mockResolvedValue([]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('muestra el botón de reabrir torneo solo cuando el estado es COMPLETED', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'COMPLETED',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });

    renderPage();

    expect(await screen.findByText('detail.actions.revert-to-in-progress')).toBeInTheDocument();
  });

  it('no muestra el botón de reabrir torneo si el estado no es COMPLETED', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'IN_PROGRESS',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByText('detail.actions.revert-to-in-progress')).not.toBeInTheDocument();
  });

  it('al reabrir el torneo llama al use case y actualiza el estado a IN_PROGRESS', async () => {
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'COMPLETED',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockRevertToInProgress.mockResolvedValue({
      status: 'IN_PROGRESS',
      updatedAt: '2026-07-09T00:00:00Z',
    });

    renderPage();

    const reopenButton = await screen.findByText('detail.actions.revert-to-in-progress');
    fireEvent.click(reopenButton);

    await waitFor(() => {
      expect(mockRevertToInProgress).toHaveBeenCalledWith('comp-1');
    });
    expect(customToast.success).toHaveBeenCalledWith('detail.success.revertedToInProgress');
    expect(screen.getByText('detail.actions.complete')).toBeInTheDocument();
  });
});


// FE #571: elegir alias o nombre legal en ESTA competición
describe('CompetitionDetail - alias o nombre real', () => {
  const miInscripcion = (overrides = {}) => ({
    id: 'enrollment-mia',
    status: 'APPROVED',
    userId: 'creator-1',
    userName: 'Chuchi',
    userHandicap: 12.4,
    hasCustomHandicap: false,
    customHandicap: null,
    team: null,
    useRealName: true,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser.alias = 'Chuchi';
    mockAuthUser.first_name = 'Agustín';
    mockAuthUser.last_name = 'Estévez';
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockListEnrollments.mockResolvedValue([miInscripcion()]);
    mockSetNamePreference.mockResolvedValue({});
  });

  afterEach(() => {
    // El usuario del mock es compartido por todo el fichero: dejarlo tocado
    // haría pasar por casualidad a cualquier test que se añada detrás
    delete mockAuthUser.alias;
    mockAuthUser.first_name = 'Test';
    mockAuthUser.last_name = 'Creator';
  });

  const encuentraElInterruptor = () => {
    renderPage();
    return screen.findByRole('switch');
  };

  it('sale apagado de fábrica: la competición muestra el nombre legal', async () => {
    const interruptor = await encuentraElInterruptor();

    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText('detail.namePreference.helpUsingRealName')
    ).toBeInTheDocument();
  });

  it('sale encendido si el jugador pidió su alias para esta competición', async () => {
    mockListEnrollments.mockResolvedValue([miInscripcion({ useRealName: false })]);

    const interruptor = await encuentraElInterruptor();

    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('detail.namePreference.helpUsingAlias')).toBeInTheDocument();
  });

  it.each(['REJECTED', 'CANCELLED', 'WITHDRAWN'])(
    'no lo ofrece en una inscripción %s: ese nombre no se ve en ninguna pantalla',
    async (status) => {
      mockListEnrollments.mockResolvedValue([miInscripcion({ status })]);

      renderPage();

      await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    }
  );

  it('no lo ofrece a quien no tiene alias: las dos opciones pintarían lo mismo', async () => {
    mockAuthUser.alias = null;

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('no lo ofrece si la inscripción propia no llegó en la lista: sin id no hay PUT', async () => {
    // `competition.enrollment_status` basta para saber que estás inscrito, pero
    // viene sin el id del enrollment
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
      enrollment_status: 'APPROVED',
    });
    mockListEnrollments.mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.getByText('detail.enrollmentStatus')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('no lo ofrece sobre la inscripción de otro jugador', async () => {
    mockListEnrollments.mockResolvedValue([
      miInscripcion({ id: 'enrollment-ajena', userId: 'otro-jugador', userName: 'Meis' }),
    ]);

    renderPage();

    await waitFor(() => expect(mockListEnrollments).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('guarda la elección y vuelve a pedir la lista, que es quien resuelve el nombre', async () => {
    mockSetNamePreference.mockResolvedValue({ useRealName: false });
    const interruptor = await encuentraElInterruptor();
    mockListEnrollments.mockResolvedValue([
      miInscripcion({ useRealName: false, userName: 'Chuchi' }),
    ]);

    fireEvent.click(interruptor);

    await waitFor(() => {
      expect(mockSetNamePreference).toHaveBeenCalledWith('enrollment-mia', false);
    });
    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
    expect(screen.getByText('Chuchi')).toBeInTheDocument();
    expect(customToast.error).not.toHaveBeenCalled();
  });

  it('si el guardado falla, avisa con el texto traducido y el interruptor se queda donde estaba', async () => {
    mockSetNamePreference.mockRejectedValue(new Error('403 Forbidden'));

    const interruptor = await encuentraElInterruptor();
    fireEvent.click(interruptor);

    await waitFor(() =>
      expect(customToast.error).toHaveBeenCalledWith('detail.namePreference.failed')
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('si lo que falla es recargar la lista, no dice que no se guardó', async () => {
    // El PUT fue bien: el interruptor tiene que reflejarlo, y un aviso de
    // fallo mandaría al jugador a repetir el cambio y dejarlo como estaba
    mockSetNamePreference.mockResolvedValue({ useRealName: false });
    const interruptor = await encuentraElInterruptor();
    mockListEnrollments.mockRejectedValue(new Error('500 Internal Server Error'));

    fireEvent.click(interruptor);

    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });
    expect(customToast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('switch')).not.toBeDisabled();
  });

  it('se deshabilita mientras guarda, para que no salgan dos peticiones', async () => {
    let resuelve;
    mockSetNamePreference.mockReturnValue(new Promise((r) => { resuelve = r; }));

    const interruptor = await encuentraElInterruptor();
    fireEvent.click(interruptor);

    await waitFor(() => expect(screen.getByRole('switch')).toBeDisabled());
    fireEvent.click(screen.getByRole('switch'));
    expect(mockSetNamePreference).toHaveBeenCalledTimes(1);

    resuelve({ useRealName: false });
    await waitFor(() => expect(screen.getByRole('switch')).not.toBeDisabled());
  });
});
