import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeaderboardView from './LeaderboardView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const mockLeaderboard = {
  teamAName: 'Team Red',
  teamBName: 'Team Blue',
  teamAPoints: 4.5,
  teamBPoints: 3.5,
  matches: [
    {
      matchId: 'm-1',
      matchNumber: 1,
      matchFormat: 'SINGLES',
      status: 'IN_PROGRESS',
      currentHole: 12,
      standing: '2UP',
      leadingTeam: 'A',
      teamAPlayers: [{ userId: 'u1', userName: 'Player A' }],
      teamBPlayers: [{ userId: 'u2', userName: 'Player B' }],
      result: null,
    },
    {
      matchId: 'm-2',
      matchNumber: 2,
      matchFormat: 'FOURBALL',
      status: 'COMPLETED',
      currentHole: 18,
      standing: null,
      leadingTeam: null,
      teamAPlayers: [{ userId: 'u3', userName: 'Player C' }],
      teamBPlayers: [{ userId: 'u4', userName: 'Player D' }],
      result: { winner: 'B', score: '2&1' },
    },
  ],
};

describe('LeaderboardView', () => {
  it('should return null when leaderboard is null', () => {
    const { container } = render(<LeaderboardView leaderboard={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the leaderboard', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-view')).toBeInTheDocument();
  });

  it('should display team standings header', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('team-standings-header')).toBeInTheDocument();
  });

  it('should show in progress section', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-view')).toHaveTextContent('leaderboard.inProgress');
  });

  it('should show completed section', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-view')).toHaveTextContent('leaderboard.completed');
  });

  it('should display match details', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-match-m-1')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-match-m-2')).toBeInTheDocument();
  });

  it('should show player names', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-view')).toHaveTextContent('Player A');
    expect(screen.getByTestId('leaderboard-view')).toHaveTextContent('Player B');
  });

  it('should show match standing', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-match-m-1')).toHaveTextContent('2UP');
  });

  it('should show completed match result', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    expect(screen.getByTestId('leaderboard-match-m-2')).toHaveTextContent('2&1');
  });

  it('should show no matches message when empty', () => {
    const empty = { ...mockLeaderboard, matches: [] };
    render(<LeaderboardView leaderboard={empty} />);
    expect(screen.getByTestId('leaderboard-view')).toHaveTextContent('leaderboard.noMatches');
  });
});
