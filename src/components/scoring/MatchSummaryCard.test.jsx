import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchSummaryCard from './MatchSummaryCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const mockSummary = {
  matchId: 'm-1',
  result: { winner: 'A', score: '3&2' },
  stats: {
    playerGrossTotal: 82,
    playerNetTotal: 72,
    holesWon: 8,
    holesLost: 5,
  },
  matchComplete: true,
};

describe('MatchSummaryCard', () => {
  it('should return null for null summary', () => {
    const { container } = render(<MatchSummaryCard summary={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render with summary data', () => {
    render(<MatchSummaryCard summary={mockSummary} />);
    expect(screen.getByTestId('match-summary-card')).toBeInTheDocument();
  });

  it('should display result score', () => {
    render(<MatchSummaryCard summary={mockSummary} />);
    expect(screen.getByTestId('match-summary-card')).toHaveTextContent('3&2');
  });

  it('should display stats', () => {
    render(<MatchSummaryCard summary={mockSummary} />);
    const card = screen.getByTestId('match-summary-card');
    expect(card).toHaveTextContent('82');
    expect(card).toHaveTextContent('72');
    expect(card).toHaveTextContent('8');
    expect(card).toHaveTextContent('5');
  });

  it('should show match complete message', () => {
    render(<MatchSummaryCard summary={mockSummary} />);
    expect(screen.getByTestId('match-summary-card')).toHaveTextContent('summary.matchComplete');
  });

  it('should display the resolved winner name when provided', () => {
    render(<MatchSummaryCard summary={mockSummary} winnerName="Team A (John Doe)" />);
    expect(screen.getByTestId('match-summary-card')).toHaveTextContent('Team A (John Doe)');
  });

  it('should not display a winner line when winnerName is not provided', () => {
    render(<MatchSummaryCard summary={mockSummary} />);
    expect(screen.getByTestId('match-summary-card')).not.toHaveTextContent('summary.winner');
  });

  it('should show the halved message instead of a winner name for a tied match', () => {
    const halvedSummary = { ...mockSummary, result: { winner: 'HALVED', score: 'AS' } };
    render(<MatchSummaryCard summary={halvedSummary} winnerName="Team A (John Doe)" />);
    const card = screen.getByTestId('match-summary-card');
    expect(card).toHaveTextContent('summary.halved');
    expect(card).not.toHaveTextContent('John Doe');
  });
});
