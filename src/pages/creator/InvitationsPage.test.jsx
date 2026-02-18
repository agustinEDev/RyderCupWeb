import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import InvitationsPage from './InvitationsPage';

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

vi.mock('../../hooks/useUserRoles', () => ({
  useUserRoles: () => ({
    isAdmin: false,
    isCreator: true,
    isLoading: false,
  }),
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <div data-testid="header-auth">Header</div>,
}));

const mockGetCompetitionDetail = vi.fn().mockResolvedValue({
  id: 'comp-1',
  name: 'Summer Cup',
  status: 'ACTIVE',
});

const mockListCompetitionInvitations = vi.fn().mockResolvedValue({
  invitations: [],
  totalCount: 0,
});

const mockSendInvitationByEmail = vi.fn();

vi.mock('../../composition', () => ({
  getCompetitionDetailUseCase: { execute: (...args) => mockGetCompetitionDetail(...args) },
  listCompetitionInvitationsUseCase: { execute: (...args) => mockListCompetitionInvitations(...args) },
  sendInvitationByEmailUseCase: { execute: (...args) => mockSendInvitationByEmail(...args) },
}));

vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={['/creator/competitions/comp-1/invitations']}>
      <Routes>
        <Route path="/creator/competitions/:id/invitations" element={<InvitationsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('InvitationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render header and page title', async () => {
    renderPage();

    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    // Wait for async load
    expect(await screen.findByText('creator.title')).toBeInTheDocument();
  });

  it('should show empty state when no invitations', async () => {
    renderPage();
    expect(await screen.findByText('noInvitations')).toBeInTheDocument();
  });

  it('should render invitations when present', async () => {
    mockListCompetitionInvitations.mockResolvedValue({
      invitations: [
        {
          id: 'inv-1',
          competitionName: 'Summer Cup',
          inviteeEmail: 'player@test.com',
          inviteeName: 'Player One',
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
    expect(await screen.findByTestId('invitation-card')).toBeInTheDocument();
  });

  it('should have status filter dropdown', async () => {
    renderPage();
    expect(await screen.findByTestId('status-filter')).toBeInTheDocument();
  });

  it('should have send invitation button', async () => {
    renderPage();
    expect(await screen.findByText('creator.sendNew')).toBeInTheDocument();
  });
});
