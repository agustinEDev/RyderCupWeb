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

  it('should show match standing without team name', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-1');
    expect(matchCard).toHaveTextContent('2UP');
    // Ryder Cup format: standing alone, no team name appended
    expect(matchCard).not.toHaveTextContent('2UP Team Red');
  });

  it('should show completed match result with winner', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-2');
    // Result includes team name and score via i18n: "leaderboard.wins {team: Team Blue, score: 2&1}"
    expect(matchCard).toHaveTextContent('Team Blue');
    expect(matchCard).toHaveTextContent('2&1');
  });

  it('should highlight leading team player name', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-1');
    // Team A is leading (2UP) — Player A should be bold
    const playerAText = matchCard.querySelector('.font-bold.text-gray-900');
    expect(playerAText).toHaveTextContent('Player A');
  });

  it('should highlight winner player name in completed match', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-2');
    // Team B won — Player D should be bold
    const boldElements = matchCard.querySelectorAll('.font-bold.text-gray-900');
    const boldTexts = Array.from(boldElements).map(el => el.textContent);
    expect(boldTexts).toContain('Player D');
  });

  it('should display players vertically with standing between them', () => {
    render(<LeaderboardView leaderboard={mockLeaderboard} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-1');
    // Vertical layout: both player names and standing should all be within the card
    expect(matchCard).toHaveTextContent('Player A');
    expect(matchCard).toHaveTextContent('Player B');
    expect(matchCard).toHaveTextContent('2UP');
  });

  it('should convert 5UP to 5&4 format when match ended before hole 18', () => {
    const decidedEarly = {
      ...mockLeaderboard,
      matches: [
        {
          matchId: 'm-3',
          matchNumber: 3,
          matchFormat: 'SINGLES',
          status: 'COMPLETED',
          currentHole: 14,
          standing: null,
          leadingTeam: null,
          teamAPlayers: [{ userId: 'u5', userName: 'Player E' }],
          teamBPlayers: [{ userId: 'u6', userName: 'Player F' }],
          result: { winner: 'A', score: '5UP' },
        },
      ],
    };
    render(<LeaderboardView leaderboard={decidedEarly} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-3');
    // 5UP at hole 14 → 5&4 (5 up with 4 to play)
    expect(matchCard).toHaveTextContent('5&4');
    expect(matchCard).not.toHaveTextContent('5UP');
  });

  it('should keep UP format when match ended on hole 18', () => {
    const decidedAt18 = {
      ...mockLeaderboard,
      matches: [
        {
          matchId: 'm-4',
          matchNumber: 4,
          matchFormat: 'SINGLES',
          status: 'COMPLETED',
          currentHole: 18,
          standing: null,
          leadingTeam: null,
          teamAPlayers: [{ userId: 'u7', userName: 'Player G' }],
          teamBPlayers: [{ userId: 'u8', userName: 'Player H' }],
          result: { winner: 'B', score: '2UP' },
        },
      ],
    };
    render(<LeaderboardView leaderboard={decidedAt18} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-4');
    expect(matchCard).toHaveTextContent('2UP');
  });

  it('should show conceded match with conceded label instead of wins', () => {
    const conceded = {
      ...mockLeaderboard,
      matches: [
        {
          matchId: 'm-5',
          matchNumber: 5,
          matchFormat: 'FOURBALL',
          status: 'CONCEDED',
          currentHole: null,
          standing: null,
          leadingTeam: null,
          teamAPlayers: [{ userId: 'u9', userName: 'Player I' }],
          teamBPlayers: [{ userId: 'u10', userName: 'Player J' }],
          result: { winner: 'A', score: 'CONCEDED' },
        },
      ],
    };
    render(<LeaderboardView leaderboard={conceded} />);
    const matchCard = screen.getByTestId('leaderboard-match-m-5');
    // Uses conceded template, not wins template
    expect(matchCard).toHaveTextContent('leaderboard.conceded');
    expect(matchCard).toHaveTextContent('Team Red');
    expect(matchCard).not.toHaveTextContent('leaderboard.wins');
  });

  it('should show no matches message when empty', () => {
    const empty = { ...mockLeaderboard, matches: [] };
    render(<LeaderboardView leaderboard={empty} />);
    expect(screen.getByTestId('leaderboard-view')).toHaveTextContent('leaderboard.noMatches');
  });
});
