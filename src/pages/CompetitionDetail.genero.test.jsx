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

const mockAuthUser = { id: 'player-1', first_name: 'Test', last_name: 'Player' };

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
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

/**
 * Pedir plaza desde la ficha pregunta el género solo a quien no lo tiene, y lo
 * guarda ANTES de pedirla: el servidor la rechaza sin él (#710, 24 sep).
 */
describe('CompetitionDetail · el género al pedir plaza', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orden.length = 0;
    mockGetCompetitionDetail.mockResolvedValue({
      id: 'comp-1',
      name: 'Summer Cup',
      status: 'ACTIVE',
      creatorId: 'creator-1',
      maxPlayers: 20,
      countries: [],
    });
    mockListEnrollments.mockResolvedValue([]);
  });

  it('P1: sin género se pregunta, se guarda y luego se pide la plaza', async () => {
    faltaGenero = true;
    renderPage();

    fireEvent.click(await screen.findByText('detail.actions.request-to-join'));
    fireEvent.change(await screen.findByTestId('selector-de-genero'), {
      target: { value: 'MALE' },
    });
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(mockGuardarGenero).toHaveBeenCalledWith('MALE');
    // La sesión, al final: refrescarla antes recargaba la ficha en mitad
    await waitFor(() => expect(orden).toEqual(['genero', 'plaza', 'sesion']));
  });

  it('P2: con género no se pregunta ni se toca el perfil', async () => {
    faltaGenero = false;
    renderPage();

    fireEvent.click(await screen.findByText('detail.actions.request-to-join'));
    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(orden).toEqual(['plaza']);
  });

  it('P3: si no se pudo guardar el género, no se pide la plaza', async () => {
    faltaGenero = true;
    mockGuardarGenero.mockRejectedValueOnce(new Error('sin red'));
    renderPage();

    fireEvent.click(await screen.findByText('detail.actions.request-to-join'));
    fireEvent.change(await screen.findByTestId('selector-de-genero'), {
      target: { value: 'FEMALE' },
    });
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() => expect(customToast.error).toHaveBeenCalledWith('sin red'));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockRefrescarSesion).not.toHaveBeenCalled();
  });

  it('P4: si la plaza falla tras guardar el género, la sesión se pone al día igual', async () => {
    faltaGenero = true;
    mockRequest.mockRejectedValueOnce(new Error('llena'));
    renderPage();

    fireEvent.click(await screen.findByText('detail.actions.request-to-join'));
    fireEvent.change(await screen.findByTestId('selector-de-genero'), {
      target: { value: 'MALE' },
    });
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    await waitFor(() => expect(mockRefrescarSesion).toHaveBeenCalled());
  });
});
