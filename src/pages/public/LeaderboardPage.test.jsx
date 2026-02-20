import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'c-1' }),
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

vi.mock('../../components/layout/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
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
});
