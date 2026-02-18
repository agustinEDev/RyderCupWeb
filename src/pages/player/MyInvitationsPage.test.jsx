import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyInvitationsPage from './MyInvitationsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.count !== undefined) return `${key}_${params.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', first_name: 'Test', last_name: 'User' },
    loading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockListMyInvitations = vi.fn().mockResolvedValue({
  invitations: [],
  totalCount: 0,
});

const mockRespondToInvitation = vi.fn();

vi.mock('../../composition', () => ({
  listMyInvitationsUseCase: { execute: (...args) => mockListMyInvitations(...args) },
  respondToInvitationUseCase: { execute: (...args) => mockRespondToInvitation(...args) },
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/player/invitations']}>
      <Routes>
        <Route path="/player/invitations" element={<MyInvitationsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('MyInvitationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header and page title', async () => {
    renderPage();
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    expect(await screen.findByText('player.title')).toBeInTheDocument();
  });

  it('should show empty state when no invitations', async () => {
    renderPage();
    expect(await screen.findByText('noInvitations')).toBeInTheDocument();
  });

  it('should render invitations with accept/decline buttons', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionId: 'comp-1',
          competitionName: 'Summer Cup',
          inviterName: 'Creator',
          inviteeEmail: 'player@test.com',
          status: 'PENDING',
          isPending: true,
          isAccepted: false,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
        },
      ],
      totalCount: 1,
    });

    renderPage();
    expect(await screen.findByTestId('accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('decline-button')).toBeInTheDocument();
  });

  it('should have status filter dropdown', async () => {
    renderPage();
    expect(await screen.findByTestId('status-filter')).toBeInTheDocument();
  });

  it('should show pending count badge', async () => {
    mockListMyInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionId: 'comp-1',
          competitionName: 'Cup',
          status: 'PENDING',
          isPending: true,
          isAccepted: false,
          isDeclined: false,
          isExpired: false,
          personalMessage: null,
          inviteeEmail: 'p@t.com',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          respondedAt: null,
        },
      ],
      totalCount: 1,
    });

    renderPage();
    expect(await screen.findByText('player.pendingCount_1')).toBeInTheDocument();
  });
});
