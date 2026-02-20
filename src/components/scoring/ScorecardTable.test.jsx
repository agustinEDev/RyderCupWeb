import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScorecardTable from './ScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const holes = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

const players = [
  { userId: 'u1', userName: 'Player A', team: 'A' },
  { userId: 'u2', userName: 'Player B', team: 'B' },
];

describe('ScorecardTable', () => {
  it('should render the scorecard', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should display OUT and IN sections', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.out');
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.in');
  });

  it('should display player names', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Player A');
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Player B');
  });

  it('should display par values', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.par');
  });

  it('should display stroke index values', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.si');
  });

  it('should show dash when no score', () => {
    render(<ScorecardTable holes={holes} players={players} scores={[]} currentUserId="u1" />);
    const table = screen.getByTestId('scorecard-table');
    expect(table).toBeInTheDocument();
  });

  it('should highlight current user row', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 5, netScore: 4, validationStatus: 'match' }] }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" />);
    const table = screen.getByTestId('scorecard-table');
    expect(table.innerHTML).toContain('bg-blue-50');
  });

  it('should render with empty arrays', () => {
    render(<ScorecardTable />);
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should display result row', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.result');
  });

  it('should show hole result winner', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }], holeResult: { winner: 'A', standing: '1UP' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('A');
  });
});
