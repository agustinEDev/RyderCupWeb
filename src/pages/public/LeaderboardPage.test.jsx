import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockLocationState = { state: null };
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'c-1' }),
  useLocation: () => mockLocationState,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../composition', () => ({
  getLeaderboardUseCase: {
    execute: vi.fn().mockResolvedValue({
      teamAName: 'Red',
      teamBName: 'Blue',
      teamAPoints: 3,
      teamBPoints: 2,
      matches: [],
    }),
  },
}));

const mockUser = { current: null };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

vi.mock('../../components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../components/layout/HeaderAuth', () => ({
  default: ({ user }) => <div data-testid="header-auth">{user?.id}</div>,
}));

vi.mock('../../components/layout/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../components/scoring/LeaderboardView', () => ({
  default: ({ leaderboard }) => leaderboard ? <div data-testid="leaderboard-view">Leaderboard</div> : null,
}));

import LeaderboardPage from './LeaderboardPage';
import { getLeaderboardUseCase } from '../../composition';

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.current = null;
    mockLocationState.state = null;
  });

  it('should render the page with header and footer', async () => {
    render(<LeaderboardPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should display the title', () => {
    render(<LeaderboardPage />);
    expect(screen.getByText('leaderboard.title')).toBeInTheDocument();
  });

  it('should call getLeaderboardUseCase with competition id', () => {
    render(<LeaderboardPage />);
    expect(getLeaderboardUseCase.execute).toHaveBeenCalledWith('c-1');
  });

  it('should show loading spinner initially', () => {
    getLeaderboardUseCase.execute.mockReturnValue(new Promise(() => {})); // never resolves
    render(<LeaderboardPage />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('should link back to schedule by default', () => {
    mockLocationState.state = null;
    render(<LeaderboardPage />);
    const backLink = screen.getByText(/summary.backToSchedule/);
    expect(backLink.closest('a')).toHaveAttribute('href', '/competitions/c-1/schedule');
  });

  it('should link back to competition detail when from=detail', () => {
    mockLocationState.state = { from: 'detail' };
    render(<LeaderboardPage />);
    const backLink = screen.getByText(/summary.backToCompetition/);
    expect(backLink.closest('a')).toHaveAttribute('href', '/competitions/c-1');
  });

  it('should show public header when user is not logged in', () => {
    mockUser.current = null;
    render(<LeaderboardPage />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.queryByTestId('header-auth')).not.toBeInTheDocument();
  });

  it('should show authenticated header when user is logged in', () => {
    mockUser.current = { id: 'u-1', name: 'Test User' };
    render(<LeaderboardPage />);
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
  });
});
