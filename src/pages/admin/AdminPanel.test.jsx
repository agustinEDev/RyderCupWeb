import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPanel from './AdminPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params?.count !== undefined ? `${key}_${params.count}` : key),
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

vi.mock('../../composition', () => ({
  getAdminStatsUseCase: { execute: (...args) => mockGetAdminStats(...args) },
  listAdminUsersUseCase: { execute: (...args) => mockListAdminUsers(...args) },
  updateAdminUserUseCase: { execute: (...args) => mockUpdateAdminUser(...args) },
  setAdminUserActiveUseCase: { execute: (...args) => mockSetAdminUserActive(...args) },
  deleteAdminUserUseCase: { execute: (...args) => mockDeleteAdminUser(...args) },
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

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminStats.mockResolvedValue(stats);
    mockListAdminUsers.mockResolvedValue(usersResponse);
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

    fireEvent.click(screen.getByRole('button', { name: /tabs.users/ }));

    await waitFor(() => expect(mockListAdminUsers).toHaveBeenCalled());
    expect(await screen.findByText('Agus Estevez')).toBeInTheDocument();
  });

  it('renders the embedded GolfCourses tab', async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /tabs.golfCourses/ }));

    expect(await screen.findByTestId('golf-courses-tab')).toBeInTheDocument();
  });

  it('renders the embedded PendingGolfCourses tab', async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /tabs.pending/ }));

    expect(await screen.findByTestId('pending-golf-courses-tab')).toBeInTheDocument();
  });

  it('opens the edit modal and calls updateAdminUserUseCase on save', async () => {
    mockUpdateAdminUser.mockResolvedValue({ ...usersResponse.users[0], firstName: 'Renamed' });
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /tabs.users/ }));
    await screen.findByText('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.editTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }));

    await waitFor(() => expect(mockUpdateAdminUser).toHaveBeenCalledWith('u1', expect.any(Object)));
  });

  it('opens the manage modal and calls setAdminUserActiveUseCase on confirm', async () => {
    mockSetAdminUserActive.mockResolvedValue();
    render(<AdminPanel />);
    await waitFor(() => expect(mockGetAdminStats).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /tabs.users/ }));
    await screen.findByText('Agus Estevez');

    fireEvent.click(screen.getByRole('button', { name: 'users.deactivateTooltip' }));
    fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' }));

    await waitFor(() => expect(mockSetAdminUserActive).toHaveBeenCalledWith('u1', false));
  });
});
