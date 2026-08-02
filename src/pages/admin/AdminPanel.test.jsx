import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPanel from './AdminPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params?.count !== undefined ? `${key}_${params.count}` : key),
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', first_name: 'Admin', last_name: 'User', is_admin: true },
    loading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

vi.mock('./GolfCourses', () => ({
  default: () => <div data-testid="golf-courses-tab">Golf Courses</div>,
}));

vi.mock('./PendingGolfCourses', () => ({
  default: () => <div data-testid="pending-golf-courses-tab">Pending</div>,
}));

const mockGetAdminStats = vi.fn();
const mockListAdminUsers = vi.fn();
const mockUpdateAdminUser = vi.fn();
const mockSetAdminUserActive = vi.fn();
const mockDeleteAdminUser = vi.fn();
const mockAdminListCompetitions = vi.fn();
const mockAdminUpdateCompetition = vi.fn();
const mockActivateCompetition = vi.fn();
const mockCloseEnrollments = vi.fn();
const mockStartCompetition = vi.fn();
const mockCompleteCompetition = vi.fn();
const mockCancelCompetition = vi.fn();
const mockReopenEnrollments = vi.fn();
const mockRevertCompetitionStatus = vi.fn();
const mockRevertCompetitionToInProgress = vi.fn();

vi.mock('../../composition', () => ({
  getAdminStatsUseCase: { execute: (...args) => mockGetAdminStats(...args) },
  listAdminUsersUseCase: { execute: (...args) => mockListAdminUsers(...args) },
  updateAdminUserUseCase: { execute: (...args) => mockUpdateAdminUser(...args) },
  setAdminUserActiveUseCase: { execute: (...args) => mockSetAdminUserActive(...args) },
  deleteAdminUserUseCase: { execute: (...args) => mockDeleteAdminUser(...args) },
  adminListCompetitionsUseCase: { execute: (...args) => mockAdminListCompetitions(...args) },
  adminUpdateCompetitionUseCase: { execute: (...args) => mockAdminUpdateCompetition(...args) },
  activateCompetitionUseCase: { execute: (...args) => mockActivateCompetition(...args) },
  closeEnrollmentsUseCase: { execute: (...args) => mockCloseEnrollments(...args) },
  startCompetitionUseCase: { execute: (...args) => mockStartCompetition(...args) },
  completeCompetitionUseCase: { execute: (...args) => mockCompleteCompetition(...args) },
  cancelCompetitionUseCase: { execute: (...args) => mockCancelCompetition(...args) },
  reopenEnrollmentsUseCase: { execute: (...args) => mockReopenEnrollments(...args) },
  revertCompetitionStatusUseCase: { execute: (...args) => mockRevertCompetitionStatus(...args) },
  revertCompetitionToInProgressUseCase: { execute: (...args) => mockRevertCompetitionToInProgress(...args) },
}));

const stats = {
  totalUsers: 9,
  totalCompetitions: 1,
  totalQuickMatches: 25,
  totalGolfCoursesApproved: 1,
  totalGolfCoursesPending: 0,
};

const usersResponse = {
  users: [
    {
      id: 'u1',
      firstName: 'Agus',
      lastName: 'Estevez',
      email: 'agus@test.com',
      handicap: 17.7,
      isAdmin: true,
      isActive: true,
      emailVerified: true,
      createdAt: '2026-07-27T00:00:00Z',
    },
  ],
  totalCount: 1,
  limit: 20,
  offset: 0,
};

const competitionsResponse = [
  {
    id: 'c1',
    name: 'Ryder Cup Local',
    status: 'DRAFT',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    creator: { firstName: 'Ana', lastName: 'Ruiz' },
  },
  {
    id: 'c2',
    name: 'Stuck Tournament',
    status: 'IN_PROGRESS',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    creator: { firstName: 'Bea', lastName: 'Soto' },
  },
];

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminStats.mockResolvedValue(stats);
    mockListAdminUsers.mockResolvedValue(usersResponse);
    mockAdminListCompetitions.mockResolvedValue(competitionsResponse);
  });

  it('loads and renders the overview stats on mount', async () => {
    render(<AdminPanel />);

    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    expect(await screen.findByText('9')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('loads and renders the users table when switching to the Usuarios tab', async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /tabs.users/ }));

    await waitFor(() => expect(mockListAdminUsers).toHaveBeenCalled());
    expect(await screen.findByText('Agus Estevez')).toBeInTheDocument();
  });

  it('renders the embedded GolfCourses tab', async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /tabs.golfCourses/ }));

    expect(await screen.findByTestId('golf-courses-tab')).toBeInTheDocument();
  });

  it('renders the embedded PendingGolfCourses tab', async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /tabs.pending/ }));

    expect(await screen.findByTestId('pending-golf-courses-tab')).toBeInTheDocument();
  });

  it('opens the edit modal and calls updateAdminUserUseCase on save', async () => {
    mockUpdateAdminUser.mockResolvedValue({ ...usersResponse.users[0], firstName: 'Renamed' });
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.users/ }));
    await screen.findByText('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.editTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(mockUpdateAdminUser).toHaveBeenCalledWith('u1', expect.any(Object)));
  });

  it('opens the manage modal and calls setAdminUserActiveUseCase on confirm', async () => {
    mockSetAdminUserActive.mockResolvedValue();
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.users/ }));
    await screen.findByText('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deactivateTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' }));

    await waitFor(() => expect(mockSetAdminUserActive).toHaveBeenCalledWith('u1', false));
  });

  it('permanently deletes a user once the confirmation word is typed', async () => {
    mockDeleteAdminUser.mockResolvedValue();
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.users/ }));
    await screen.findByText('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deleteTooltip' }));
    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    fireEvent.change(screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder'), {
      target: { value: 'manageModal.confirmDeleteWord' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDelete' }));

    await waitFor(() => expect(mockDeleteAdminUser).toHaveBeenCalledWith('u1'));
    // Refreshes the overview stats after a successful delete
    await waitFor(() => expect(mockGetAdminStats.mock.calls.length).toBeGreaterThan(1));
  });

  it('shows the blocked message when delete is rejected with a 409', async () => {
    const error = new Error('has created one or more quick matches');
    error.status = 409;
    mockDeleteAdminUser.mockRejectedValue(error);
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.users/ }));
    await screen.findByText('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deleteTooltip' }));
    fireEvent.click(screen.getByRole('radio', { name: /manageModal.deleteOption/ }));
    fireEvent.change(screen.getByPlaceholderText('manageModal.confirmDeletePlaceholder'), {
      target: { value: 'manageModal.confirmDeleteWord' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDelete' }));

    expect(await screen.findByText('manageModal.deleteBlockedTitle')).toBeInTheDocument();
    // The user is still present in the table — nothing was deleted
    expect(screen.getByText('Agus Estevez')).toBeInTheDocument();
  });

  it('loads and renders the competitions table when switching to the Competitions tab', async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: /tabs.competitions/ }));

    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());
    expect(await screen.findByText('Ryder Cup Local')).toBeInTheDocument();
    expect(screen.getByText('Stuck Tournament')).toBeInTheDocument();
  });

  it('only allows editing DRAFT competitions and saves via adminUpdateCompetitionUseCase', async () => {
    mockAdminUpdateCompetition.mockResolvedValue({ id: 'c1', name: 'Renamed' });
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.competitions/ }));
    await screen.findByText('Ryder Cup Local');

    const editButtons = screen.getAllByRole('button', { name: 'competitions.editTooltip' });
    expect(editButtons).toHaveLength(1); // only the DRAFT competition has an enabled edit button

    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: 'competitions.editModal.save' }));

    await waitFor(() => expect(mockAdminUpdateCompetition).toHaveBeenCalledWith('c1', expect.any(Object)));
  });

  it('runs a non-destructive transition immediately', async () => {
    mockActivateCompetition.mockResolvedValue({ id: 'c1', status: 'ACTIVE' });
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.competitions/ }));
    await screen.findByText('Ryder Cup Local');

    fireEvent.click(screen.getByRole('button', { name: 'competitions.actions.activate' }));

    await waitFor(() => expect(mockActivateCompetition).toHaveBeenCalledWith('c1'));
  });

  it('paginates competitions using the extra-item hasMore trick (no backend total count)', async () => {
    const fullPage = Array.from({ length: 21 }, (_, i) => ({
      id: `c${i}`,
      name: `Competition ${i}`,
      status: 'DRAFT',
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      creator: { firstName: 'Ana', lastName: 'Ruiz' },
    }));
    mockAdminListCompetitions.mockResolvedValue(fullPage);
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.competitions/ }));
    await waitFor(() => expect(mockAdminListCompetitions).toHaveBeenCalled());

    // 21 fetched (limit 20 + 1) means there's a next page; only 20 are shown.
    expect(screen.getByText('Competition 19')).toBeInTheDocument();
    expect(screen.queryByText('Competition 20')).not.toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: 'competitions.next' });
    expect(screen.getByRole('button', { name: 'competitions.previous' })).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    mockAdminListCompetitions.mockResolvedValue([]);
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(mockAdminListCompetitions).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 20, limit: 21 })
      )
    );
  });

  it('requires confirmation before cancelling a competition', async () => {
    mockCancelCompetition.mockResolvedValue({ id: 'c1', status: 'CANCELLED' });
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: /tabs.competitions/ }));
    await screen.findByText('Ryder Cup Local');

    fireEvent.click(screen.getAllByRole('button', { name: 'competitions.actions.cancel' })[0]);
    expect(mockCancelCompetition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'competitions.confirmCancel' }));

    await waitFor(() => expect(mockCancelCompetition).toHaveBeenCalledWith('c1'));
  });
});
