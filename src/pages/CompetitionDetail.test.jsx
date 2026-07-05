import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

const mockSetCustomHandicap = vi.fn().mockResolvedValue({});
const mockRemoveCustomHandicap = vi.fn().mockResolvedValue({});

vi.mock('../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...args) => mockGetCompetitionDetail(...args) },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  activateCompetitionUseCase: { execute: vi.fn() },
  closeEnrollmentsUseCase: { execute: vi.fn() },
  startCompetitionUseCase: { execute: vi.fn() },
  completeCompetitionUseCase: { execute: vi.fn() },
  cancelCompetitionUseCase: { execute: vi.fn() },
  deleteCompetitionUseCase: { execute: vi.fn() },
  reopenEnrollmentsUseCase: { execute: vi.fn() },
  revertCompetitionStatusUseCase: { execute: vi.fn() },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  requestEnrollmentUseCase: { execute: vi.fn() },
  approveEnrollmentUseCase: { execute: vi.fn() },
  rejectEnrollmentUseCase: { execute: vi.fn() },
  assignTeamsUseCase: { execute: vi.fn() },
  setCustomHandicapUseCase: { execute: (...args) => mockSetCustomHandicap(...args) },
  removeCustomHandicapUseCase: { execute: (...args) => mockRemoveCustomHandicap(...args) },
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
