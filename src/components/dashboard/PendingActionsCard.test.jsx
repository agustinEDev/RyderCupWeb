import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PendingActionsCard from './PendingActionsCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined && params?.name) return `${key}_${params.count}_${params.name}`;
      if (params?.count !== undefined) return `${key}_${params.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, whileHover, whileTap, ...rest }) => {
      void initial; void animate; void transition; void whileHover; void whileTap;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockListMyInvitations = vi.fn();
const mockListEnrollments = vi.fn();
const mockGetSchedule = vi.fn();

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => mockListMyInvitations(...args) },
  listEnrollmentsUseCase: { execute: (...args) => mockListEnrollments(...args) },
  getScheduleUseCase: { execute: (...args) => mockGetSchedule(...args) },
}));

const baseUser = {
  id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  roles: [{ name: 'PLAYER' }],
};

const creatorUser = {
  ...baseUser,
  roles: [{ name: 'CREATOR' }],
};

const renderCard = (user = baseUser, competitions = []) => {
  return render(
    <MemoryRouter>
      <PendingActionsCard user={user} competitions={competitions} />
    </MemoryRouter>
  );
};

describe('PendingActionsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMyInvitations.mockResolvedValue({ invitations: [], totalCount: 0 });
    mockListEnrollments.mockResolvedValue([]);
    mockGetSchedule.mockResolvedValue({ rounds: [] });
  });

  it('should not render when there are no pending items', async () => {
    renderCard();
    await waitFor(() => {
      expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
    });
  });

  it('should render pending invitations section', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        { id: 'inv-1', competitionId: 'comp-1', status: 'PENDING' },
        { id: 'inv-2', competitionId: 'comp-2', status: 'PENDING' },
      ],
      totalCount: 2,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('pending-actions-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('pending-invitations-action')).toBeInTheDocument();
  });

  it('should navigate to invitations page when clicking pending invitations', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [{ id: 'inv-1', competitionId: 'comp-1', status: 'PENDING' }],
      totalCount: 1,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('pending-invitations-action')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pending-invitations-action'));
    expect(mockNavigate).toHaveBeenCalledWith('/player/invitations');
  });

  it('should show enrollment requests for creator users', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE' },
    ];

    mockListEnrollments.mockResolvedValue([
      { id: 'enr-1', status: 'REQUESTED' },
      { id: 'enr-2', status: 'REQUESTED' },
    ]);

    renderCard(creatorUser, competitions);

    await waitFor(() => {
      expect(screen.getByTestId('pending-enrollments-action')).toBeInTheDocument();
    });
  });

  it('should not show enrollment requests for non-creator users', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE' },
    ];

    renderCard(baseUser, competitions);

    await waitFor(() => {
      expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
    });
    expect(mockListEnrollments).not.toHaveBeenCalled();
  });

  it('should navigate to competition detail when clicking enrollment action', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Summer Cup', status: 'ACTIVE' },
    ];

    mockListEnrollments.mockResolvedValue([
      { id: 'enr-1', status: 'REQUESTED' },
    ]);

    renderCard(creatorUser, competitions);

    await waitFor(() => {
      expect(screen.getByTestId('pending-enrollments-action')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pending-enrollments-action'));
    expect(mockNavigate).toHaveBeenCalledWith('/competitions/comp-1');
  });

  it('should show upcoming matches for active competitions', async () => {
    const competitions = [
      { id: 'comp-1', name: 'Cup', status: 'IN_PROGRESS' },
    ];

    mockGetSchedule.mockResolvedValue({
      rounds: [
        {
          matches: [
            { id: 'm-1', status: 'SCHEDULED' },
            { id: 'm-2', status: 'IN_PROGRESS' },
            { id: 'm-3', status: 'COMPLETED' },
          ],
        },
      ],
    });

    renderCard(baseUser, competitions);

    await waitFor(() => {
      expect(screen.getByTestId('upcoming-matches-action')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockListMyInvitations.mockRejectedValue(new Error('Network error'));

    renderCard();

    await waitFor(() => {
      expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
    });
  });

  it('should not render when user is null', () => {
    renderCard(null);
    expect(screen.queryByTestId('pending-actions-card')).not.toBeInTheDocument();
  });
});
